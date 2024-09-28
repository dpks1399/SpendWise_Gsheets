import gspread
from google.oauth2.service_account import Credentials

scopes = ["https://www.googleapis.com/auth/spreadsheets"]
creds = Credentials.from_service_account_file("creds.json", scopes=scopes)
client = gspread.authorize(creds)

sheet_id = "167TruMZkr8pwfjiAvrRCLdHAeKxKAfN5c8I98L6NbxI"
workbook = client.open_by_key(sheet_id)


def getSources():
    source_sheet = workbook.get_worksheet(1)
    sources = source_sheet.col_values(1)
    return sources[1:]

def getCategories():
    txn_sheet = workbook.get_worksheet(0)
    categories = txn_sheet.col_values(3)
    return list(set(categories[1:]))

def getTransactions():
    txn_sheet = workbook.get_worksheet(0)
    records = txn_sheet.get_all_records()
    return records[::-1]

def insertTxn(data):
    try:
        values = [
            data['datetime'],
            data['amount'],
            data['category'],
            data['description'],
            data['source'],
            data['type']
        ]
        txn_sheet = workbook.get_worksheet(0)
        print(values)
        txn_sheet.append_row(values)
        return {'status':'success', 'result':1}
    except Exception as e:
        return {'status':'fail', 'result':str(e)}







def test():
    print(getSources())

    data_obj = {
        'type': "transactionType",
        'amount': "amount",
        'description': "description",
        'category': "category",
        'source': "source",
        'datetime': "dateTime"
    }
    print(insertTxn(data_obj))

if __name__ == '__main__':
    test();   
