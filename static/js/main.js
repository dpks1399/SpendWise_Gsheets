
document.addEventListener("DOMContentLoaded", function() {
    fetchCategories();  // remove paid recurring categories
    fetchSources();
    fetchOverview();
    fetchTransactions();
    fetchRecurring();
    showScreen('home-screen');  // Show the Add Transaction screen by default
    // addTxnPopup(1);
});

function fetchOverview(){
    fetch('/api/get_acc_overview')
    .then(response => response.json())
    .then(stats => {
        populateAccOverview(stats);
    })
    .catch(error => {
        console.error('Error fetching sources:', error);
    });
}

function fetchRecurring(){
    fetch('/api/get_recurring')
    .then(response => response.json())
    .then(recurring => {
        populateRecurring(recurring);
    })
    .catch(error => {
        console.error('Error fetching sources:', error);
    });
}

function populateAccOverview(data){
    console.log(data);
    let records = ''
    for(let i=0; i<data.length; i+=1){
        let name = data[i].NAME;
        let bal = data[i].CURRENT_BALANCE;
        let due = data[i].TOTAL_UNPAID_AMOUNT;
        let spare = parseFloat(bal) - parseFloat(due);
        
        let block = `
                    <tr>
                        <td>${name}</td>
                        <td>${bal}</td>
                        <td>${due}</td>
                        <td>${spare}</td>
                    </tr>
                    `
        records = records + block;
    }
    document.getElementById('overview-tabe-body').innerHTML = records
}

function populateRecurring(txns){
    console.log(txns)
    let records = ''
    for(let i=0; i<txns.length; i+=1){
        let pay_day = txns[i].PAY_DAY;
        let day = pay_day.split(' ')[0];
        let month = pay_day.split(' ')[1];
        let cat_name = txns[i].CATEGORY_NAME;
        let amount = txns[i].AMOUNT;
        let id = txns[i].ID;
        let ts = txns[i].PAYMENT_TS;
        let type = '';
        let type_text = txns[i].PAY_STATUS;
        // if(ts){
        //     type = 'paid'
        // }
        // else{
        //     type = 'unpaid'
        // }
        type = (type_text == 'Paid') ? 'paid' : (type_text == 'Overdue') ? 'overdue' : 'unpaid';
    
        block = `
                <div class="rec-record ${type}" id="${id}">
                    <div class="date">
                        <div class="txn_date">${day}</div>
                        <div class="txn_month">${month}</div>
                    </div>
                    <div class="content">
                        <h4>${cat_name}</h4>
                        <span>&#8377 ${amount}</span>
                    </div>
                    <div class="status">
                        <span>${type_text}</span>
                    </div>
                </div>
            `
        records = records + block;
    }
    document.getElementById('recPayments').innerHTML = records
}

function sendInsertTxnData(data) {
    fetch('/api/insert_transaction', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        console.log('Response from Flask:', data["status"], data["result"]);
        if(data["status"]=="success" && data["result"]==1){
            fetchCategories();
            resetTxn();
            alert("Transaction Saved");
            // addTxnPopup(0);
            fetchTransactions();
        } else {
            console.log('Could not save transaction.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        // Handle errors
    });
}

// Your original function to format the datetime
function getformattedDatetime(val) {
    if (!val) {
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Months are zero-based
        const day = String(currentDate.getDate()).padStart(2, '0');
        const hours = String(currentDate.getHours()).padStart(2, '0');
        const minutes = String(currentDate.getMinutes()).padStart(2, '0');
        const seconds = String(currentDate.getSeconds()).padStart(2, '0');

        const formattedDateTime = `${year}-${month}-${day} ${hours}:${minutes}:00`;
        return formattedDateTime;
    } else {
        return val.replace('T', ' ') + ':00';
    }
}

// Fetch sources for the dropdown
function fetchSources() {
    fetch('/api/get_sources')
    .then(response => response.json())
    .then(sources => {
        populateDropdown('source-drop-sc01', sources);
    })
    .catch(error => {
        console.error('Error fetching sources:', error);
    });
}

// Fetch categories for the dropdown
function fetchCategories() {
    fetch('/api/get_categories')
    .then(response => response.json())
    .then(categories => {
        populateDropdown('category-drop-sc01', categories);
    })
    .catch(error => {
        console.error('Error fetching categories:', error);
    });
}

function fetchTransactions(){
    fetch('/api/get_transactions')
    .then(response => response.json())
    .then(txns => {
        populateTransactions(txns);
    })
    .catch(error => {
        console.error('Error fetching transactions:', error);
    });
}

function toggleOverlay(val){
    if(val==1){
       document.getElementById('overlay').style.display = 'block'; 
    }
    else if(val == 0){
        document.getElementById('overlay').style.display = 'none'; 
    }
}

function editDeleteTransaction(id){
    // alert("edit or delete"+id);
    toggleOverlay(1);
}

function populateTransactions(txns){

    let records = ''
    for(let i=0; i<txns.length; i+=1){
        let id = txns[i].ID;
        let source = txns[i].SOURCE;
        let category = txns[i].CATEGORY;
        let amount = txns[i].AMOUNT;
        let description = txns[i].DESCRIPTION;
        let datetime = txns[i].DATETIME;
        let type = txns[i].TYPE;
        let sign = ''
        let am_val = ''
        let t_val = ''
        if(type == 'expenditure'){
            sign = '-'
            am_val = 'negative'
            t_val = 'expense'
        }
        else if(type == "income"){
            sign = '+'
            am_val = 'positive'
            t_val = 'income'
        }
        
        let txn_block = ` <div class="expense-card ${t_val}" id="${id}" onclick="editDeleteTransaction(${id})">
                            <div class="icon">💰</div>
                            <div class="details">
                                <h3>${category}</h3>
                                <p>${description}</p>
                                <p>${datetime}</p>
                            </div>
                            <div class="amount ${am_val}">${sign} &#8377 ${amount}</div>
                        </div>
                        `

        records = records + txn_block
    }
    document.getElementById('view-Txn-Container').innerHTML = records
        
}

// Populate dropdowns with fetched data
function populateDropdown(dropdownId, items) {
    const dropdown = document.getElementById(dropdownId);
    dropdown.innerHTML = ''; // Clear any existing options

    let def = dropdownId == 'category-drop-sc01'? 'Category' : dropdownId == 'source-drop-sc01'? 'Account' : '' ;

    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Select ' + def;
    option.selected = true;
    dropdown.appendChild(option);

    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item["id"];
        option.textContent = item["value"];
        dropdown.appendChild(option);
    });
}

// Toggle between category input and dropdown
function toggleCategoryInput() {
    const categoryDropdown = document.getElementById('category-drop-sc01');
    const customCategoryInput = document.getElementById('custom-category-input');
    const addButton = document.getElementById('add-category-btn');

    if (customCategoryInput.style.display === 'none') {
        customCategoryInput.style.display = 'block';
        categoryDropdown.style.display = 'none';
        addButton.textContent = 'Cancel';
        categoryDropdown.value = '';
    } else {
        customCategoryInput.style.display = 'none';
        categoryDropdown.style.display = 'block';
        addButton.textContent = 'Add';
        customCategoryInput.value = '';
    }
}

function addNewCategory(name,type){
    // insert category
    if(type == "normal"){
        val = 0;
    }
    else{
        val=1;
    }
    data = {
        'name':name,
        'type':val
    }
    var id = sendInsertCategoryData(data)
    //fetch category id
    //return category id
}

// Add transaction function (untouched as per your original code)
function addTxn() {
    var type_element = document.querySelector(".txn-type-container .selected");
    var transactionType = type_element.getAttribute("name")
    var amount = document.getElementById("amount-sc01").value;
    var description = document.getElementById("description-sc01").value;
    var category = '-1';
    var cust_category='-1';
    var source = document.getElementById("source-drop-sc01").value;
    var dateTime = getformattedDatetime(document.getElementById("transaction-datetime-sc01").value);

    if (!document.getElementById("custom-category-input").value) {
        category = document.getElementById("category-drop-sc01").value;
    } else {
        cust_category = document.getElementById("custom-category-input").value;
    }

    if (!amount) {
        alert("Please enter an Amount.");
        return;
    }
    if (isNaN(amount) || parseFloat(amount) <= 0) {
        alert("Amount should be a valid positive number.");
        return;
    }
    if (!category && !cust_category) {
        alert("Please select a Category.");
        return;
    }
    if (!source) {
        alert("Please select a Source.");
        return;
    }
    if (!transactionType) {
        transactionType = "expenditure"; // Default to Expenditure if not selected
    }

    console.log("Transaction Type:", transactionType);
    console.log("Amount:", amount);
    console.log("Description:", description);
    console.log("Category:", category);
    console.log("Custom Category:", cust_category);
    console.log("Source:", source);
    console.log("Date and Time:", dateTime);

    var data_obj = {
            'type': transactionType,
            'amount': amount,
            'description': description,
            'category': category,
            'cust_category': cust_category,
            'source': source,
            'datetime': dateTime
    };
    console.log(data_obj);
    sendInsertTxnData(data_obj);
}

// Reset transaction form
function resetTxn() {
    changeTxnTyp(0);
    document.getElementById("amount-sc01").value = '';
    document.getElementById("description-sc01").value = '';
    document.getElementById("custom-category-input").value = '';
    document.getElementById("category-drop-sc01").value = '';
    document.getElementById("source-drop-sc01").value = '';
    document.getElementById("transaction-datetime-sc01").value = '';
}

// Handle screen switching for bottom nav bar
function showScreen(screenId, icon='default') {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.style.display = 'none';
    });

    const activeScreen = document.getElementById(screenId);
    const title = document.getElementById("screenTitle");
    if (activeScreen) {
        activeScreen.style.display = 'block';
        title.textContent = activeScreen.getAttribute("name")
        const title_icon = document.getElementById('titleIcon');
        if (icon == 'default'){
            document.getElementById('backHome').style.display = 'none';
            document.getElementById('menuOpen').style.display = 'block';
        }
        else if (icon == 'back'){
            document.getElementById('menuOpen').style.display = 'none';
            document.getElementById('backHome').style.display = 'block';
        }
        // console.log(activeScreen.getAttribute("name"))
    }
}

function addTxnPopup(val){
    if(val == 0){
        showScreen('home-screen');
        // document.getElementById("addTxnPopup").style.display = "none";
        // document.getElementById("addTnxPopBtn").style.display = "block";
        // document.getElementById("home-screen-content").style.display = "block";
    }
    else if(val == 1){
        showScreen('add-transaction-screen','back');
        // document.getElementById("home-screen-content").style.display = "none";
        // document.getElementById("addTxnPopup").style.display = "block";
        // document.getElementById("addTnxPopBtn").style.display = "none";
    }
    
}

// function titleBack(){
//     showScreen('home-screen');
//     selectNav('nav-home');
// }

function toggleMenu(){
    document.getElementById("menuContainer").classList.toggle("active");
}

function selectNav(id){
    const navs = document.querySelectorAll('.nav-item');
    navs.forEach(nav => {
        nav.classList.remove("nav-active");
    });

    const activeNav = document.getElementById(id);
    // const title = document.getElementById("screenTitle");
    if (activeNav) {
        activeNav.classList.add("nav-active");
        // title.textContent = activeScreen.getAttribute("name")
        // console.log(activeScreen.getAttribute("name"))
    }
}

function changeTxnTyp(val){
    const exp = document.getElementById("type-btn-expenditure");
    const inc = document.getElementById("type-btn-income");
    const trn = document.getElementById("type-btn-transfer");
    exp.classList.remove("selected");
    inc.classList.remove("selected");
    trn.classList.remove("selected");
    if(val == 0){exp.classList.add("selected");}
    else if(val == 1){inc.classList.add("selected");}
    else if(val == 2){trn.classList.add("selected");}
}

// Event listeners for bottom navigation
document.getElementById('nav-home').addEventListener('click', () => {
    showScreen('home-screen');
    selectNav('nav-home');
});

document.getElementById('nav-view-transactions').addEventListener('click', () => {
    showScreen('view-transactions-screen');
    selectNav('nav-view-transactions');
});

document.getElementById('nav-overview').addEventListener('click', () => {
    showScreen('overview-screen');
    selectNav('nav-overview');
});

document.getElementById('nav-recurring').addEventListener('click', () => {
    showScreen('recurring-screen');
    selectNav('nav-recurring');
});

document.getElementById('menuOpen').addEventListener('click', () => {
    toggleMenu();
});

document.getElementById('menuClose').addEventListener('click', () => {
    toggleMenu();
});

document.getElementById('backHome').addEventListener('click', () => {
    showScreen('home-screen');
    selectNav('nav-home');
});
// // document.getElementById('nav-reports').addEventListener('click', () => {
//     showScreen('reports-screen');
// });
