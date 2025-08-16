from flask import Flask, render_template, jsonify, request # type: ignore
import configparser
from worker_supabase import Supabase
import bcrypt  # type: ignore

app = Flask(__name__)
sb = Supabase()

@app.route("/")
def home():
    sb.runMonthCheck()
    return render_template('index.html')
    # return render_template('login.html')

@app.route('/api/get_categories', methods=['GET'])
def get_categories():
    categories = sb.getCategories()
    return jsonify(categories)

@app.route('/api/signup', methods=['POST'])
def sign_up():
    data = request.json
    print(data)
    name = data["name"]
    email = data["email"]
    password = data["password"]
    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400
    hashed_password = str(bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()))
    print(name,email,password,hashed_password)
    res = sb.signUp(name,email,hashed_password)
    return jsonify(res)

@app.route('/api/get_sources', methods=['GET'])
def get_sources():
    sources = sb.getSources()
    return jsonify(sources)

@app.route('/api/get_recurring', methods=['GET'])
def get_recurring():
    rec = sb.getRecurring()
    return jsonify(rec)

@app.route('/api/get_transactions', methods=['GET'])
def get_transactions():
    txns = sb.getTransactions()
    return jsonify(txns)

@app.route('/api/get_acc_overview', methods=['GET'])
def get_acc_overview():
    txns = sb.fetchAccountOverview()
    return jsonify(txns)

@app.route('/api/get_month_overview', methods=['GET'])
def get_month_overview():
    txns = sb.fetchThisDayMonthOverview()
    return jsonify(txns)
    
@app.route('/api/insert_transaction', methods=['POST'])
def process_data():
    data = request.json  # Assuming JSON data is sent from frontend
    response_data = sb.insertTxn(data)
    return jsonify(response_data)


if __name__ == '__main__':
    app.run(host = '0.0.0.0', debug = True, port = 5001)