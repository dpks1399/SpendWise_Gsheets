from flask import Flask, render_template, jsonify, request
import configparser
from worker_supabase import getSources, getCategories, insertTxn, getTransactions, getRecurring, fetchAccountOverview
    
app = Flask(__name__)

@app.route("/")
def home():
    return render_template('login.html')

@app.route('/api/get_categories', methods=['GET'])
def get_categories():
    categories = getCategories()
    return jsonify(categories)

@app.route('/api/get_sources', methods=['GET'])
def get_sources():
    sources = getSources()
    return jsonify(sources)

@app.route('/api/get_recurring', methods=['GET'])
def get_recurring():
    rec = getRecurring()
    return jsonify(rec)

@app.route('/api/get_transactions', methods=['GET'])
def get_transactions():
    txns = getTransactions()
    return jsonify(txns)

@app.route('/api/get_acc_overview', methods=['GET'])
def get_acc_overview():
    txns = fetchAccountOverview()
    return jsonify(txns)
    
@app.route('/api/insert_transaction', methods=['POST'])
def process_data():
    data = request.json  # Assuming JSON data is sent from frontend
    response_data = insertTxn(data)
    return jsonify(response_data)

def first_of_month_check():
    pass

if __name__ == '__main__':
    first_of_month_check()
    app.run(host = '0.0.0.0', debug = True) 
    # result = query_handler('select * from public.users','','select')
    # print(get_categories())