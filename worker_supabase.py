import psycopg2
import json
import datetime

def load_db_creds():
    try:
        with open('creds_supabase.json', 'r') as f:
            creds = json.load(f)
        return creds
    except FileNotFoundError:
        print("creds file not found")
        return None
    except json.JSONDecodeError:
        print("Error decoding creds")
        return None

SCHEMA = dict(load_db_creds())["SCHEMA"]

def inr_format(amount):
    amount = str(amount)
    
    if "." in amount:
        whole, decimal = amount.split(".")  # Split whole and decimal parts
    else:
        whole, decimal = amount, None

    if len(whole) <= 3:
        formatted_whole = whole  # No formatting needed for numbers <= 999
    else:
        last_three = whole[-3:]  # Get last 3 digits
        rest = whole[:-3]  # Get remaining digits
        
        # Group in 2s from the end
        formatted_whole = ",".join([rest[i:i+2] for i in range(0, len(rest), 2)])  
        formatted_whole = f"{formatted_whole},{last_three}" if formatted_whole else last_three
    
    return f"{formatted_whole}.{decimal}" if decimal else formatted_whole

def convert_to_dict(cols,rows):
    data_dicts = [dict(zip(cols, row)) for row in rows]
    return data_dicts

def get_db_connection():
    creds = load_db_creds()
    if creds:
        try:
            conn = psycopg2.connect(
                host=creds['DB_HOST'],
                database=creds['DB_NAME'],
                user=creds['DB_USER'],
                password=creds['DB_PASSWORD']
            )
            return conn
        except psycopg2.Error as e:
            print(f"Error connecting to database: {e}")
            return None
    else:
        return None

def run_query(query, params=None):
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute(query, params)
            conn.commit()
            cursor.close()
        except psycopg2.Error as e:
            print(f"Error executing query: {e}")
            conn.rollback()
        finally:
            conn.close()

def fetch_query(query, params=None):
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute(query, params)
            header = [desc[0].upper() for desc in cursor.description]  # Get column names
            result = cursor.fetchall()
            cursor.close()
            return header, result
        except psycopg2.Error as e:
            print(f"Error fetching query: {e}")
            return None
        finally:
            conn.close()

def fetch_transactions_as_dict(query):
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cursor:
                cursor.execute(query)
                columns = [desc[0].upper() for desc in cursor.description]  # Get column names
                rows = cursor.fetchall()  # Fetch all rows
                
                # Convert rows to list of dictionaries
                result = []
                for row in rows:
                    record = dict(zip(columns, row))
                    # Convert DATETIME from datetime object to string
                    record['DATETIME'] = record['DATETIME'].strftime('%d %b %Y | %H:%M')
                    record['AMOUNT'] = inr_format(record['AMOUNT'])
                    result.append(record)
                
                return result
        finally:
            conn.close()
    return []

def getSources():
    query = f'select distinct name,id from {SCHEMA}.accounts_master order by id;'
    _, result = fetch_query(query)
    sources = [{'value': name, 'id': id} for name, id in result]
    return sources

def getCategories():
    query = f'''
                SELECT c.category,c.type,c.id
                FROM sw_gusr_001.categories c
                LEFT JOIN sw_gusr_001.transactions_master t 
                    ON c.id = t.category 
                    AND c.type = 1  -- Only check transactions for income categories
                    AND DATE_TRUNC('month', t.datetime) = DATE_TRUNC('month', CURRENT_DATE)
                where 
                    c.type = 0 or t.id is null
                order by c.type,c.id;
            '''
    _, result = fetch_query(query)
    print(result)
    categories =[{'value': category, 'id': id} for category, _, id in result]
    return categories

def getRecurring():
    query = f'''               
                SELECT 
                    r.id,
                    c.category AS category_name,
                    r.amount,
                    a.name AS account_name,
                    r.pay_day,
                    t.datetime AS payment_ts 
                FROM sw_gusr_001.recurring r
                JOIN sw_gusr_001.categories c ON r.cat_id = c.id
                JOIN sw_gusr_001.accounts_master a ON r.source = a.id
                LEFT JOIN sw_gusr_001.transactions_master t 
                    ON r.cat_id = t.category
                    AND DATE_TRUNC('month', t.datetime) = DATE_TRUNC('month', CURRENT_DATE)
                order by r.pay_day;  
    '''
    cols, result = fetch_query(query)
    rec = convert_to_dict(cols,result)
    for item in rec:
        item['PAY_STATUS'] = 'Paid' if item['PAYMENT_TS'] else 'Overdue' if (int(datetime.datetime.now().day) >= int(item['PAY_DAY'])) else 'Unpaid'
        item["PAY_DAY"] = f"{item['PAY_DAY']} {datetime.datetime.now().strftime('%b')}"
    # print(rec)
    # categories =[{'value': category, 'id': id} for category, _, id in result]
    return rec

def getTransactions():
    query = f'''
                SELECT 
                    t.id,
                    t.amount,
                    c.category AS category,
                    a.name AS source,
                    t.description,
                    t.type,
                    t.datetime
                FROM {SCHEMA}.transactions_master t
                JOIN {SCHEMA}.categories c ON t.category = c.id
                JOIN {SCHEMA}.accounts_master a ON t.source = a.id
                ORDER BY t.datetime DESC;
    '''
    result = fetch_transactions_as_dict(query)
    return result

def insertTxn(data):
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor()
        try:
            if (data['category'] =='-1' and not (data['cust_category']=='-1')):
                name = data['cust_category']
                params = (name,0)
                ins_query = f'insert into {SCHEMA}.categories (category,type) values(%s,%s)'
                cursor.execute(ins_query,params)
                conn.commit()
                get_query = f"select id from {SCHEMA}.categories where category = '{name}'"
                cursor.execute(get_query)
                res = cursor.fetchall()
                data["category"] = res[0][0]

            params = (
                int(data['amount']),
                int(data['category']),
                int(data['source']),
                data['description'],
                data['type'],
                data['datetime']
            )
            query = f'insert into {SCHEMA}.transactions_master (AMOUNT, CATEGORY, SOURCE, DESCRIPTION, TYPE, DATETIME) values(%s,%s,%s,%s,%s,%s);'
            cursor.execute(query,params)
            conn.commit()
            return {'status':'success', 'result':1} 
        except Exception as e:
            return {'status':'fail', 'result':str(e)}
        finally:
            cursor.close()
            conn.close()
    else:
        return {'status':'fail', 'result':'could not connect'}

def fetchAccountOverview():
    total_bal_query = '''
                            SELECT 
                            a.id, 
                            a.name,
                            a.balance as initial_balance, 
                            a.balance + COALESCE(SUM(
                                CASE 
                                    WHEN t.type = 'income' THEN t.amount
                                    WHEN t.type = 'expenditure' THEN -t.amount
                                    ELSE 0
                                END
                            ), 0) AS current_balance,
                            SUM(
                                CASE 
                                    WHEN t.type = 'income' THEN t.amount
                                    ELSE 0
                                END
                            ) AS total_income,
                            SUM(
                                CASE 
                                    WHEN t.type = 'expenditure' THEN t.amount
                                    ELSE 0
                                END
                            ) AS total_expense
                        FROM sw_gusr_001.accounts_master a
                        LEFT JOIN sw_gusr_001.transactions_master t 
                            ON a.id = t.source 
                            AND t.datetime > a.updated_at  -- Only consider transactions after last update
                        GROUP BY a.id, a.name, a.balance
                        ORDER BY a.id;
                    '''
    total_dues_query = '''
                            SELECT 
                                a.id AS account_id, 
                                COALESCE(SUM(r.amount), 0) AS total_dues  
                            FROM sw_gusr_001.accounts_master a
                            LEFT JOIN sw_gusr_001.recurring r 
                                ON a.id = r.source  
                            LEFT JOIN sw_gusr_001.transactions_master t 
                                ON r.cat_id = t.category 
                                AND r.source = t.source  
                                AND DATE_TRUNC('month', t.datetime) = DATE_TRUNC('month', CURRENT_DATE)  
                            WHERE 
                                t.id IS NULL  
                            GROUP BY 
                                a.id  
                            ORDER BY 
                                a.id;  
                        '''
    cols,rows = fetch_query(total_bal_query)
    bal = convert_to_dict(cols,rows)
    cols,rows = fetch_query(total_dues_query)
    dues = convert_to_dict(cols,rows)
    combined_list = []
    for item1 in bal:
        matching_item = next((item2 for item2 in dues if item2['ACCOUNT_ID'] == item1['ID']), None)
        if matching_item:
            combined_item = {**item1, **matching_item}
            combined_item.pop('ACCOUNT_ID')
            combined_list.append(combined_item)
    # print(combined_list)
    for item in combined_list:
        item['SPARE_AMOUNT'] = float(item['CURRENT_BALANCE']) - float(item['TOTAL_DUES'])
    return(combined_list)


def test():
    # print(getCategories())
    # print(getSources())
    fetchAccountOverview()

    # data_obj = {
    #     'type': "expenditure",
    #     'amount': '2',
    #     'description': "tst",
    #     'category': "-1",
    #     'cust_category':"trying",
    #     'source': "1",
    #     'datetime': "2024-09-25 21:33:00"
    # }
    # print(insertTxn(data_obj))
    # # print(getTransactions())

if __name__ == '__main__':
    test();   
