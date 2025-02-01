import psycopg2
import json

# SCHEMA = 'sw_v2'
SCHEMA = 'sw_usr_001'

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

def load_db_creds():
    try:
        with open('creds_supabase.json', 'r') as f:
            creds = json.load(f)
        return creds
    except FileNotFoundError:
        print("creds.json file not found")
        return None
    except json.JSONDecodeError:
        print("Error decoding creds.json")
        return None

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
            result = cursor.fetchall()
            cursor.close()
            return result
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
    result = fetch_query(query)
    sources = [{'value': name, 'id': id} for name, id in result]
    return sources

def getCategories():
    query = f'select distinct category,type,id from {SCHEMA}.categories order by type,id;'
    result = fetch_query(query)
    print(result)
    categories =[{'value': category, 'id': id} for category, _, id in result]
    return categories

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


def test():
    # print(getCategories())
    # print(getSources())
    

    data_obj = {
        'type': "expenditure",
        'amount': '2',
        'description': "tst",
        'category': "-1",
        'cust_category':"trying",
        'source': "1",
        'datetime': "2024-09-25 21:33:00"
    }
    print(insertTxn(data_obj))
    # print(getTransactions())

if __name__ == '__main__':
    test();   
