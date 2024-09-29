import psycopg2
import json

SCHEMA = 'sw_v2'

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
                    record['DATETIME'] = record['DATETIME'].strftime('%Y-%m-%d %H:%M:%S')
                    result.append(record)
                
                return result
        finally:
            conn.close()
    return []

def getSources():
    query = f'select distinct(name) from {SCHEMA}.accounts_master;'
    result = fetch_query(query)
    sources = [source[0] for source in result]
    return sources

def getCategories():
    query = f'select distinct(category) from {SCHEMA}.transactions_master;'
    result = fetch_query(query)
    categories = [category[0] for category in result]
    return categories

def getTransactions():
    query = f'select * from {SCHEMA}.transactions_master order by datetime desc;'
    result = fetch_transactions_as_dict(query)
    return result

def insertTxn(data):
    try:
        params = (
            int(data['amount']),
            data['category'],
            data['source'],
            data['description'],
            data['type'],
            data['datetime']
        )
        query = f'insert into {SCHEMA}.transactions_master (AMOUNT, CATEGORY, SOURCE, DESCRIPTION, TYPE, DATETIME) values(%s,%s,%s,%s,%s,%s);'
        run_query(query,params)
        return {'status':'success', 'result':1}
    except Exception as e:
        return {'status':'fail', 'result':str(e)}







def test():
    # print(getCategories())
    # print(getSources())
    

    data_obj = {
        'type': "spend",
        'amount': '600',
        'description': "description",
        'category': "category",
        'source': "source",
        'datetime': "2024-09-25 21:33:00"
    }
    print(insertTxn(data_obj))
    print(getTransactions())

if __name__ == '__main__':
    test();   
