import psycopg2 # type: ignore
import json
import datetime

# self.SCHEMA = dict(load_db_creds())["SCHEMA"]

class Supabase():

    def __init__(self):
        self.SCHEMA = dict(self.load_db_creds())["SCHEMA"]

    def load_db_creds(self):
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
            
    def inr_format(self,amount):
        amount = str(amount)
        sign = ''
        if(amount[0]=='-'):
            sign = '-'
            amount = amount[1:]
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
            formatted_whole = f"{sign}{formatted_whole},{last_three}" if formatted_whole else last_three
        
        return formatted_whole

    def convert_to_dict(self,cols,rows):
        data_dicts = [dict(zip(cols, row)) for row in rows]
        return data_dicts
        
    def get_db_connection(self):
        creds = self.load_db_creds()
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

    def do_signup_activities(self,schema):
        pass

    def run_query(self,query, params=None):
        conn = self.get_db_connection()
        if conn:
            try:
                cursor = conn.cursor()
                cursor.execute(query, params)
                conn.commit()
                cursor.close()
                print('done')
            except psycopg2.Error as e:
                print(f"Error executing query: {e}")
                conn.rollback()
            finally:
                conn.close()
                
    def fetch_query(self,query, params=None):
        conn = self.get_db_connection()
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

    def fetch_transactions_as_dict(self,query):
        conn = self.get_db_connection()
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
                        record['AMOUNT'] = self.inr_format(record['AMOUNT'])
                        result.append(record)
                    
                    return result
            finally:
                conn.close()
        return []

    def getSources(self):
        query = f'select distinct name,id from {self.SCHEMA}.accounts_master order by id;'
        _, result = self.fetch_query(query)
        sources = [{'value': name, 'id': id} for name, id in result]
        return sources
        
    def getCategories(self):
        query = f'''
                    SELECT c.category,c.type,c.id
                    FROM {self.SCHEMA}.categories c
                    LEFT JOIN {self.SCHEMA}.transactions_master t 
                        ON c.id = t.category 
                        AND c.type = 1  -- Only check transactions for income categories
                        AND DATE_TRUNC('month', t.datetime) = DATE_TRUNC('month', CURRENT_DATE)
                    where 
                        c.type = 0 or t.id is null
                    order by c.type,c.id;
                '''
        _, result = self.fetch_query(query)
        # print(result)
        categories =[{'value': category, 'id': id} for category, _, id in result]
        return categories

    def getRecurring(self):
        query = f'''               
                    SELECT 
                        r.id,
                        c.category AS category_name,
                        r.amount,
                        a.name AS account_name,
                        r.pay_day,
                        t.datetime AS payment_ts 
                    FROM {self.SCHEMA}.recurring r
                    JOIN {self.SCHEMA}.categories c ON r.cat_id = c.id
                    JOIN {self.SCHEMA}.accounts_master a ON r.source = a.id
                    LEFT JOIN {self.SCHEMA}.transactions_master t 
                        ON r.cat_id = t.category
                        AND DATE_TRUNC('month', t.datetime) = DATE_TRUNC('month', CURRENT_DATE)
                    order by r.pay_day;  
        '''
        cols, result = self.fetch_query(query)
        rec = self.convert_to_dict(cols,result)
        # print(rec)
        for item in rec:
            item['PAY_STATUS'] = 'Paid' if item['PAYMENT_TS'] else 'Overdue' if (int(datetime.datetime.now().day) >= int(item['PAY_DAY'])) else 'Upcoming'
            item['PAYMENT_TS'] = item['PAYMENT_TS'].strftime('%d %b') if item['PAYMENT_TS'] else ''
            item["PAY_DAY"] = str(datetime.datetime.today().replace(day=int(item['PAY_DAY'])).strftime("%d %b %Y"))
        return rec

    def getTransactions(self):
        query = f'''
                    SELECT 
                        t.id,
                        t.amount,
                        c.category AS category,
                        a.name AS source,
                        a.identifier,
                        t.description,
                        t.type,
                        t.datetime
                    FROM {self.SCHEMA}.transactions_master t
                    JOIN {self.SCHEMA}.categories c ON t.category = c.id
                    JOIN {self.SCHEMA}.accounts_master a ON t.source = a.id
                    ORDER BY t.datetime DESC;
        '''
        result = self.fetch_transactions_as_dict(query)
        return result

    def insertTxn(self,data):
        conn = self.get_db_connection()
        if conn:
            cursor = conn.cursor()
            try:
                if (data['category'] =='-1' and not (data['cust_category']=='-1')):
                    name = data['cust_category']
                    params = (name,0)
                    ins_query = f'insert into {self.SCHEMA}.categories (category,type) values(%s,%s)'
                    cursor.execute(ins_query,params)
                    conn.commit()
                    get_query = f"select id from {self.SCHEMA}.categories where category = '{name}'"
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
                query = f'insert into {self.SCHEMA}.transactions_master (AMOUNT, CATEGORY, SOURCE, DESCRIPTION, TYPE, DATETIME) values(%s,%s,%s,%s,%s,%s);'
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

    def fetchAccountOverview(self):
        total_bal_query = f'''
                                SELECT 
                                a.id, 
                                a.name,
                                a.identifier,
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
                            FROM {self.SCHEMA}.accounts_master a
                            LEFT JOIN {self.SCHEMA}.transactions_master t 
                                ON a.id = t.source 
                                AND t.datetime > a.updated_at
                            GROUP BY a.id, a.name, a.balance
                            ORDER BY a.id;
                        '''
        total_dues_query = f'''
                                SELECT 
                                    a.id AS account_id, 
                                    COALESCE(SUM(r.amount), 0) AS total_dues  
                                FROM {self.SCHEMA}.accounts_master a
                                LEFT JOIN {self.SCHEMA}.recurring r 
                                    ON a.id = r.source  
                                LEFT JOIN {self.SCHEMA}.transactions_master t 
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
        cols,rows = self.fetch_query(total_bal_query)
        bal = self.convert_to_dict(cols,rows)
        cols,rows = self.fetch_query(total_dues_query)
        dues = self.convert_to_dict(cols,rows)
        combined_list = []
        for item1 in bal:
            matching_item = next((item2 for item2 in dues if item2['ACCOUNT_ID'] == item1['ID']), None)
            if matching_item:
                combined_item = {**item1, **matching_item}
                combined_item.pop('ACCOUNT_ID')
                combined_list.append(combined_item)
        # print(combined_list)
        for item in combined_list:
            item['SPARE_AMOUNT'] = self.inr_format(float(item['CURRENT_BALANCE']) - float(item['TOTAL_DUES']))
            item['CURRENT_BALANCE'] = self.inr_format(item['CURRENT_BALANCE'])
            item['INITIAL_BALANCE'] = self.inr_format(item['INITIAL_BALANCE'])
            item['TOTAL_DUES'] = self.inr_format(item['TOTAL_DUES'])
            item['TOTAL_EXPENSE'] = self.inr_format(item['TOTAL_EXPENSE'])
            item['TOTAL_INCOME'] = self.inr_format(item['TOTAL_INCOME'])

        return(combined_list)

    def fetchThisDayMonthOverview(self):
        day_query = f'''
                        SELECT  
                            COALESCE(SUM(CASE WHEN t.type = 'expenditure' THEN t.amount END), 0) AS day_spent,  
                            COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount END), 0) AS day_gained 
                        FROM {self.SCHEMA}.transactions_master t left join {self.SCHEMA}.categories c on t.category = c.id
                        WHERE c.type = 0 AND DATE_TRUNC('day', t.datetime) = DATE_TRUNC('day', CURRENT_DATE);
                    '''
        stat_query = f'''
                        SELECT  
                            COALESCE(SUM(CASE WHEN t.type = 'expenditure' THEN t.amount END), 0) AS month_spent,  
                            COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount END), 0) AS month_gained,  
                            (COALESCE(SUM(CASE WHEN t.type = 'expenditure' THEN t.amount END), 0) /  
                            NULLIF(COUNT(DISTINCT DATE(t.datetime)), 0)) AS month_avg_daily_spend  
                        FROM {self.SCHEMA}.transactions_master t left join {self.SCHEMA}.categories c on t.category = c.id
                        WHERE c.type = 0 AND DATE_TRUNC('month', t.datetime) = DATE_TRUNC('month', CURRENT_DATE);
                    '''
        cat_query = f'''
                        SELECT  
                            c.id AS category_id,  
                            c.category AS category_name,  
                            COALESCE(SUM(t.amount), 0) AS total_spent  
                        FROM {self.SCHEMA}.transactions_master t  
                        JOIN {self.SCHEMA}.categories c ON t.category = c.id  
                        WHERE c.type = 0  
                        AND t.type = 'expenditure'  
                        AND DATE_TRUNC('month', t.datetime) = DATE_TRUNC('month', CURRENT_DATE)  
                        GROUP BY c.id, c.category  
                        ORDER BY total_spent DESC;
                    '''
        daily_query = f'''
                        SELECT  
                            COALESCE(SUM(CASE WHEN t.type = 'expenditure' THEN t.amount END), 0) AS amount,
                            EXTRACT(DAY FROM t.datetime) AS day
                        FROM {self.SCHEMA}.transactions_master t left join {self.SCHEMA}.categories c on t.category = c.id
                        WHERE c.type = 0 AND DATE_TRUNC('month', t.datetime) = DATE_TRUNC('month', CURRENT_DATE)
                        GROUP BY EXTRACT(DAY FROM t.datetime);
                    '''
        conn = self.get_db_connection()
        if conn:
            try:
                cursor = conn.cursor()
                cursor.execute(day_query)
                header = [desc[0].upper() for desc in cursor.description]  # Get column names
                result = cursor.fetchall()
                day_stats =  self.convert_to_dict(header, result)
                cursor.execute(stat_query)
                header = [desc[0].upper() for desc in cursor.description]  # Get column names
                result = cursor.fetchall()
                month_stats =  self.convert_to_dict(header, result)
                cursor.execute(cat_query)
                header = [desc[0].upper() for desc in cursor.description]  # Get column names
                result = cursor.fetchall()
                cat_stats =  self.convert_to_dict(header, result)
                cursor.execute(daily_query)
                header = [desc[0].upper() for desc in cursor.description]  # Get column names
                result = cursor.fetchall()
                daily_stats =  self.convert_to_dict(header, result)
                cursor.close()
                res = {
                    "DAY_SPENT": day_stats[0]["DAY_SPENT"],
                    "DAY_GAINED": day_stats[0]["DAY_GAINED"],
                    "MONTH_SPENT": month_stats[0]["MONTH_SPENT"],
                    "MONTH_GAINED": month_stats[0]["MONTH_GAINED"],
                    "MONTH_AVG_DAILY_SPEND": month_stats[0]["MONTH_AVG_DAILY_SPEND"],
                    "CAT_SPEND": cat_stats,
                    "DAILY_SPEND": daily_stats
                }
                return res
            except psycopg2.Error as e:
                print(f"Error fetching query: {e}")
                return None
            finally:
                conn.close()

 
    def signUp(self,name,email,hashed_password):
        query = '''insert into sw_global.users (identifier,name,email,password) values (%s,%s,%s,%s) returning id'''
        params = ('--',name,email,hashed_password)
        conn = self.get_db_connection()
        if conn:
            try:
                cursor = conn.cursor()
                cursor.execute(query, params)
                user_id = cursor.fetchone()[0]
                identifier = f'sw_gusr_{user_id}'
                up_query = '''update sw_global.users set identifier = %s where id = %s'''
                up_params = (identifier,user_id)
                cursor.execute(up_query, up_params)
                conn.commit()
                cursor.close()
                self.do_signup_activities(identifier)
                return {'status':'success'}
            except psycopg2.Error as e:
                print(f"Error executing query: {e}")
                conn.rollback()
                return {'status':'error'}
            finally:
                conn.close()

    def runMonthCheck(self):
        # fetch updated at from accounts master
        query = f'select * from {self.SCHEMA}.accounts_master;'
        cols,rows = self.fetch_query(query)
        acc = self.convert_to_dict(cols,rows)
        upd_ids = []
        now = datetime.datetime.now()
        for item in acc:
            if item["UPDATED_AT"].year != now.year or item["UPDATED_AT"].month != now.month:
                upd_ids.append(item['ID'])
        if len(upd_ids)>0:
            end = now.replace(day=1,hour=23,minute=59,second=59,microsecond=999999) - datetime.timedelta(days=1)
            print(end)
            bal_query = f'''
                            SELECT 
                                a.id,
                                COALESCE(SUM(
                                    CASE 
                                        WHEN t.type = 'income' THEN t.amount
                                        WHEN t.type = 'expenditure' THEN -t.amount
                                        ELSE 0
                                    END
                                ), 0) AS balance   
                            FROM {self.SCHEMA}.accounts_master a
                            LEFT JOIN {self.SCHEMA}.transactions_master t 
                            ON a.id = t.source 
                            and t.datetime between a.updated_at AND '{str(end)}'
                            GROUP BY a.id ORDER BY a.id;
                        '''
            cols,rows = self.fetch_query(bal_query)
            bals = self.convert_to_dict(cols,rows)
            # print(bals)

            up_q = f'''
                update {self.SCHEMA}.accounts_master
                set updated_at = '{now.replace(day=1,hour=0,minute=0,second=0,microsecond=000000)}',
                balance = balance + case 
            '''
            case_q = ''
            for item in bals:
                case_q = f'{case_q}when id = {item["ID"]} then {item["BALANCE"]} '
            end_q = f'else balance end'
            upd_query = up_q + case_q + end_q
            self.run_query(upd_query)
        else:
            print("nothing to update")
            
        # return upd_ids
        # check month diff between updated at and current date
        # update balances




def test():
    # print(getCategories())
    # print(getSources())
    # fetchAccountOverview()

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
    sb = Supabase()
    print(sb.fetchThisDayMonthOverview())
    

if __name__ == '__main__':
    test();   
