
document.addEventListener("DOMContentLoaded", function() {
    fetchCategories();
    fetchSources();
    fetchTransactions();
    showScreen('add-transaction-screen');  // Show the Add Transaction screen by default
});

// Your original function to send transaction data
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

function populateTransactions(txns){

    let records = ''
    for(let i=0; i<txns.length; i+=1){
        let id = txns[i].ID
        let source = txns[i].SOURCE
        let category = txns[i].CATEGORY
        let amount = txns[i].AMOUNT
        let description = txns[i].DESCRIPTION
        let datetime = txns[i].DATETIME

        let txn_block = `<div class="viewTxnCard" id="${id}">\
                            <div class="content">\
                                <div class="source">\
                                    <span>${source}</span>\
                                </div>\
                                <div class="category">\
                                    <span>${category}</span>\
                                </div>\
                                <div class="amount">\
                                    <span>&#8377 ${amount}</span>\
                                </div>\
                                <div class="type">\
                                    <i class="material-icons">arrow_outward</i>\
                                </div>\
                            </div>\
                            <div class="descriptionFooter">\
                                <span class="desc">${description}</span>\
                                <span class="datetime">${datetime}</span>\
                            </div>\
                            </div>`

        // console.log(txn_block)
        records = records + txn_block
    }
    document.getElementById('view-Txn-Container').innerHTML = records
        
}

// Populate dropdowns with fetched data
function populateDropdown(dropdownId, items) {
    const dropdown = document.getElementById(dropdownId);
    dropdown.innerHTML = ''; // Clear any existing options

    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Please Select';
    option.selected = true;
    dropdown.appendChild(option);

    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item;
        option.textContent = item;
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

// Add transaction function (untouched as per your original code)
function addTxn() {
    var transactionType = document.getElementById("transaction-type-sc01").value;
    var amount = document.getElementById("amount-sc01").value;
    var description = document.getElementById("description-sc01").value;
    var category = '';
    var source = document.getElementById("source-drop-sc01").value;
    var dateTime = getformattedDatetime(document.getElementById("transaction-datetime-sc01").value);

    if (!document.getElementById("custom-category-input").value) {
        category = document.getElementById("category-drop-sc01").value;
    } else {
        category = document.getElementById("custom-category-input").value;
    }

    if (!amount) {
        alert("Please enter an Amount.");
        return;
    }
    if (isNaN(amount) || parseFloat(amount) <= 0) {
        alert("Amount should be a valid positive number.");
        return;
    }
    if (!category) {
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
    console.log("Source:", source);
    console.log("Date and Time:", dateTime);

    data_obj = {
        'type': transactionType,
        'amount': amount,
        'description': description,
        'category': category,
        'source': source,
        'datetime': dateTime
    };
    
    sendInsertTxnData(data_obj);
}

// Reset transaction form
function resetTxn() {
    document.getElementById("transaction-type-sc01").value = 'expenditure';
    document.getElementById("amount-sc01").value = '';
    document.getElementById("description-sc01").value = '';
    document.getElementById("custom-category-input").value = '';
    document.getElementById("category-drop-sc01").value = '';
    document.getElementById("source-drop-sc01").value = '';
    document.getElementById("transaction-datetime-sc01").value = '';
}

// Handle screen switching for bottom nav bar
function showScreen(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.style.display = 'none';
    });

    const activeScreen = document.getElementById(screenId);
    if (activeScreen) {
        activeScreen.style.display = 'block';
    }
}

// Event listeners for bottom navigation
document.getElementById('nav-add-transaction').addEventListener('click', () => {
    showScreen('add-transaction-screen');
});

document.getElementById('nav-view-transactions').addEventListener('click', () => {
    showScreen('view-transactions-screen');
});

document.getElementById('nav-overview').addEventListener('click', () => {
    showScreen('overview-screen');
});

document.getElementById('nav-recurring').addEventListener('click', () => {
    showScreen('recurring-screen');
});

document.getElementById('nav-reports').addEventListener('click', () => {
    showScreen('reports-screen');
});
