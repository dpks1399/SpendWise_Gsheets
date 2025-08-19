
document.addEventListener("DOMContentLoaded", function() {
    beautify();
    fetchCategories();  // remove paid recurring categories
    fetchSources();
    fetchOverview();
    fetchTransactions();
    // fetchRecurring();
    showScreen('home-screen');  // Show the Add Transaction screen by default
    updateCurrentDateTimeInAddTransaction();
    // addTxnPopup(1);
});

function beautify(){
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    const parentDiv = document.getElementById("home-screen-content");
    const spans = parentDiv.querySelectorAll("span");
    spans.forEach(span => {
    span.textContent = span.textContent.replace(/MTD/g, currentMonth);
    });
}

function updateCurrentDateTimeInAddTransaction(){
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const day = String(currentDate.getDate()).padStart(2, '0');
    const hours = String(currentDate.getHours()).padStart(2, '0');
    const minutes = String(currentDate.getMinutes()).padStart(2, '0');
    document.getElementById("transactionDateSpan-sc01").textContent = `${year}-${month}-${day}`;
    document.getElementById("transactionTimeSpan-sc01").textContent = `${hours}:${minutes}`;
}

function fetchOverview(){
    fetch('/api/get_month_overview')
    .then(response => response.json())
    .then(stats => {
        populateMonthOverview(stats);
    })
    .catch(error => {
        console.error('Error fetching month overview:', error);
    });

    fetch('/api/get_acc_overview')
    .then(response => response.json())
    .then(stats => {
        populateAccOverview(stats);
    })
    .catch(error => {
        console.error('Error fetching acc overview:', error);
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

function getColors(val){
    let opa = 0.6;
    let res = [];
    const Colors = [
        `rgba(255, 87, 51, ${opa})`,   // Red-Orange
        `rgba(51, 255, 87, ${opa})`,   // Green
        `rgba(51, 87, 255, ${opa})`,   // Blue
        `rgba(255, 51, 166, ${opa})`,  // Pink
        `rgba(166, 51, 255, ${opa})`,  // Purple
        `rgba(51, 255, 245, ${opa})`,  // Cyan
        `rgba(255, 195, 0, ${opa})`,   // Yellow
        `rgba(199, 0, 57, ${opa})`,    // Dark Red
        `rgba(144, 12, 63, ${opa})`,   // Deep Maroon
        `rgba(88, 24, 69, ${opa})`,    // Dark Purple
        `rgba(26, 188, 156, ${opa})`,  // Teal
        `rgba(46, 204, 113, ${opa})`,  // Green 2
        `rgba(52, 152, 219, ${opa})`,  // Sky Blue
        `rgba(155, 89, 182, ${opa})`,  // Lavender
        `rgba(230, 126, 34, ${opa})`,  // Orange
        `rgba(241, 196, 15, ${opa})`,  // Bright Yellow
        `rgba(231, 76, 60, ${opa})`,   // Red
        `rgba(149, 165, 166, ${opa})`, // Grey
        `rgba(52, 73, 94, ${opa})`,    // Dark Blue
        `rgba(127, 140, 141, ${opa})`  // Soft Grey
    ];
    for(let i=0; i<val; i+=1){
        res.push(Colors[i%Colors.length]);  
    }
    return res;
}

function populateMonthOverview(data){
    console.log(data);
    document.getElementById('todaySpent').innerHTML = `&#8377 ${data["DAY_SPENT"]}`;
    document.getElementById('todayGained').innerHTML = `&#8377 ${data["DAY_GAINED"]}`;
    document.getElementById('monthSpent').innerHTML = `&#8377 ${data["MONTH_SPENT"]}`;
    document.getElementById('monthGained').innerHTML = `&#8377 ${data["MONTH_GAINED"]}`;
    document.getElementById('monthDailyAvgSpent').innerHTML = `&#8377 ${data["MONTH_AVG_DAILY_SPEND"]}`;

    let cats = [];
    let amnt = [];
    let percentage = [];
    for (let i=0; i<data["CAT_SPEND"].length;i+=1){
        // console.log(data.)
        cats.push(data["CAT_SPEND"][i]["CATEGORY_NAME"])
        amnt.push(data["CAT_SPEND"][i]["TOTAL_SPENT"])
    }
    const total = amnt.reduce((sum, num) => sum + num, 0);
    percentage = total === 0 ? arr.map(() => 0) : amnt.map(num => (num / total * 100).toFixed(1));

    const ctxb = document.getElementById("monthCatChart").getContext("2d");
    const ctxl = document.getElementById("monthDailyChart").getContext("2d");

    let colors = getColors(cats.length)
    let li = ''
    for(let i=0; i<cats.length;i+=1){
        li = li + `<li><div style="background-color: ${colors[i]}"></div><div><span>${cats[i]}</span><span>&#8377 ${amnt[i]}</span></div></li>`
    }
    li = li + `<hr><li><div style="background-color: white"></div><div><span>Total</span><span>&#8377 ${data["MONTH_SPENT"]}</span></div></li>`
    document.querySelector('.home-mtd-container .chart .values ul').innerHTML = li;

    Chart.register(ChartDataLabels);
    new Chart(ctxb, {
        type: "bar", // Doughnut chart type
        data: {
            labels: cats,
            datasets: [{
                data: percentage, // Data values
                backgroundColor: colors,
                borderColor: "white",
                borderWidth: 2,
                borderRadius: 0,
            }]
        },
        options: {
            indexAxis:'y',
            responsive: true,
            scales: {
                x: {
                    min: 0,
                    max: Math.max(...percentage) * 1.25,
                    ticks: { display: false },
                    grid: { display: true }
                },
                y: {
                    ticks: { display: false },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false },
                datalabels: {
                    anchor: "end", // Position at the end of the bar
                    align: "end",  // Move label outside the bar (to the right)
                    color: "black",
                    font: { weight: 200, size: 12 },
                    formatter: (value) => value + "%"
                }
            },
        }
    });

    let dailySpend = []
    for (let i=0; i<data["DAILY_SPEND"].length;i+=1){
        // console.log(data.)
        dailySpend.push(data["DAILY_SPEND"][i]["AMOUNT"])
    }
    new Chart(ctxl, {
        type: 'line',
        data: {
            labels: Array.from({ length: 31 }, (_, i) => `${i + 1}`), // X-axis (Dates of the month)
            datasets: [{
                label: '',
                data: dailySpend,
                borderColor: 'rgba(52, 152, 219, 1)', // Blue Line
                backgroundColor: 'rgba(52, 152, 219, 0.2)', // Light Fill
                borderWidth: 1,
                pointBackgroundColor: 'rgba(52, 152, 219, 1)', // Red Points
                pointRadius: 1,
                pointHoverRadius: 7,
                fill: false, // Fill under the line
                tension: 0 // Smooth curves
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: { display: false, text: 'Day of the Month' },
                    grid: { display: false },
                    ticks:{font: {size: 10}}
                },
                y: {
                    beginAtZero: true,
                    ticks: {display: false},
                    title: { display: false, text: 'Sales ($)' },
                    grid: { color: 'rgba(0, 0, 0, 0.1)' }
                }
            },
            plugins: {
                legend: { display: false, position: 'top' },
                tooltip: { enabled: true },
                datalabels: {display: false}
            }
        }
    });
}

function populateAccOverview(data){
    // console.log(data);
    let records = ''
    for(let i=0; i<data.length; i+=1){
        let name = data[i].NAME;
        let income = data[i].TOTAL_INCOME;
        let expense = data[i].TOTAL_EXPENSE;
        let balance = data[i].CURRENT_BALANCE;
        let due = data[i].TOTAL_DUES;
        let spare = data[i].SPARE_AMOUNT;
        let identifier = data[i].IDENTIFIER;
        
        // let block = `
        //         <div class="overview-card">
        //             <div class="header">
        //                 <h4>${name}</h4>
        //                 <div class="overview-icon"><img src="static/assets/banklogos/${identifier}.png"></div>
        //             </div>
        //             <div class="body">
        //                 <span>Net Available:</span>
        //                 <span>&#8377 ${spare}</span>
        //             </div>
        //             <div class="footer">
        //                 <div class="f1">
        //                     <div>
        //                         <span>Balance: </span>
        //                         <span>&#8377 ${balance}</span>
        //                     </div>
        //                     <div>
        //                         <span>Dues: </span>
        //                         <span>&#8377 ${due}</span>
        //                     </div>
        //                 </div>
        //                 <div class="f2">
        //                     <div>
        //                         <span>Income: </span>
        //                         <span>&#8377 ${income}</span>
        //                     </div>
        //                     <div>
        //                         <span>Expense: </span>
        //                         <span>&#8377 ${expense}</span>
        //                     </div>
        //                 </div>
        //             </div>
        //         </div>
        //             `
        let block = `
                <div class="overview-card">
                    <div class="header">
                        <h4>${name}</h4>
                        <div class="overview-icon"><img src="static/assets/banklogos/${identifier}.png"></div>
                    </div>
                    <div class="body">
                        <span>Net Available:</span>
                        <span>&#8377 XXXXX</span>
                    </div>
                    <div class="footer">
                        <div class="f1">
                            <div>
                                <span>Balance: </span>
                                <span>&#8377 XXXXX</span>
                            </div>
                            <div>
                                <span>Dues: </span>
                                <span>&#8377 XXXXX</span>
                            </div>
                        </div>
                        <div class="f2">
                            <div>
                                <span>Income: </span>
                                <span>&#8377 XXXXX</span>
                            </div>
                            <div>
                                <span>Expense: </span>
                                <span>&#8377 XXXXX</span>
                            </div>
                        </div>
                    </div>
                </div>
                    `
        records = records + block;
    }
    document.getElementById('slider').innerHTML = records

    const slider = document.getElementById("slider");
    const dotsContainer = document.getElementById("dots");
    const cards = document.querySelectorAll(".overview-card");

    // Create dots dynamically
    cards.forEach((_, index) => {
        let dot = document.createElement("div");
        dot.classList.add("dot");
        if (index === 0) dot.classList.add("active"); // First dot active by default
        dot.addEventListener("click", () => {
            slider.scrollTo({
                left: slider.clientWidth * index,
                behavior: "smooth"
            });
        });
        dotsContainer.appendChild(dot);
    });
}

function populateRecurring(txns){
    console.log(txns)
    let records = '';
    let overdue_flag = 0;
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

        if(type_text == 'Overdue'){ overdue_flag = 1;}
        
        type = (type_text == 'Paid') ? 'paid' : (type_text == 'Overdue') ? 'overdue' : 'unpaid';
        
        block = `
                <div class="rec-record ${type}" id="${id}">
                    <div class="date">
                        <div class="txn_date">${day}</div>
                        <div class="txn_month">${month}</div>
                    </div>
                    <div class="content">
                        <h4>${cat_name}</h4>
                        <span>&#8377 ${amount} | ${ts}</span>
                    </div>
                    <div class="status">
                        <span>${type_text}</span>
                    </div>
                </div>
            `
        records = records + block;
    }
    console.log("flag" + overdue_flag)
    if(overdue_flag == 1){
        document.getElementById("home-alert-container").style.display = 'block';
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
function getformattedDatetime(dval, tval) {

    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const day = String(currentDate.getDate()).padStart(2, '0');
    const hours = String(currentDate.getHours()).padStart(2, '0');
    const minutes = String(currentDate.getMinutes()).padStart(2, '0');
    // const seconds = String(currentDate.getSeconds()).padStart(2, '0');
    let formattedDate = '';
    let formattedTime = ''
    if (!dval) {
        formattedDate = `${year}-${month}-${day}`;
    } else {
        formattedDate = dval;
    }
    if (!tval) {
        formattedTime = `${hours}:${minutes}:00`;
    } else {
        formattedTime = `${tval}:00`;
    }
    return `${formattedDate} ${formattedTime}`
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

// function toggleOverlay(val){
//     if(val==1){
//        document.getElementById('overlay').style.display = 'block'; 
//     }
//     else if(val == 0){
//         document.getElementById('overlay').style.display = 'none'; 
//     }
// }

function editDeleteTransaction(id){
    // alert("edit or delete"+id);
    if(id == 0){
        document.getElementById("editTxnContainer").classList.remove("active");
        document.getElementById("txn-overlay").style.display = 'none'
    }
    else{
        txn = document.getElementById(id);
        document.getElementById("edittxnlabel").innerHTML = txn.outerHTML;
        document.getElementById("txn-overlay").style.display = 'block'
        document.getElementById("editTxnContainer").classList.add("active");
    }
}

function populateTransactions(txns){

    let records = ''
    let g_date = ''
    for(let i=0; i<txns.length; i+=1){
        let id = txns[i].ID;
        let source = txns[i].SOURCE //.split(" ").map(word => word[0]).join("").toUpperCase();
        let identifier = txns[i].IDENTIFIER
        let category = txns[i].CATEGORY;
        let amount = txns[i].AMOUNT;
        let description = txns[i].DESCRIPTION;
        let date = txns[i].DATETIME.split(" | ")[0];
        let time = txns[i].DATETIME.split(" | ")[1];
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

        if(g_date != date){
            records = records + `<h4>${date}</h4>`
            g_date = date
        }
        
        let txn_block = ` <div class="expense-card ${t_val}" id="${id}" onclick="editDeleteTransaction(${id})">
                            <div class="icon"><img class="txn-logo" src="static/assets/banklogos/${identifier}.png"></div>
                            <div class="details">
                                <h3>${category}</h3>
                                <p>${description}</p>
                                <p>${source} | ${time}</p>
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
        addButton.innerHTML = '<i class="material-icons">close</i>';
        categoryDropdown.value = '';
    } else {
        customCategoryInput.style.display = 'none';
        categoryDropdown.style.display = 'block';
        addButton.innerHTML = '<i class="material-icons">playlist_add</i>';
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
    var dateTime = getformattedDatetime(document.getElementById("transactionDateSpan-sc01").textContent, document.getElementById("transactionTimeSpan-sc01").textContent);

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
    updateCurrentDateTimeInAddTransaction();
    
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

function toggleMenu(val){
    if(val == 1){
        document.getElementById("menuContainer").classList.add("active");
        document.getElementById("menu-overlay").style.display = 'block';
    }
    else if(val == 0){
        document.getElementById("menuContainer").classList.remove("active");
        document.getElementById("menu-overlay").style.display = 'none';
    }
}

function selectNav(id){
    const navs = document.querySelectorAll('.nav-item');
    navs.forEach(nav => {
        nav.classList.remove("nav-active");
        const icon = nav.querySelector("i");
        if (icon) {
            icon.className = icon.className.replace("bxs-", "bx-");
        }
    });

    const activeNav = document.getElementById(id);
    // const title = document.getElementById("screenTitle");
    if (activeNav) {
        activeNav.classList.add("nav-active");
        const icon = activeNav.querySelector("i");
        if (icon) {
            icon.className = icon.className.replace("bx-", "bxs-");
        }
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

document.getElementById("slider").addEventListener("scroll", function() {
    let scrollLeft = slider.scrollLeft;
    let cardWidth = slider.clientWidth;
    let currentIndex = Math.round(scrollLeft / cardWidth);

    document.querySelectorAll(".dot").forEach((dot, index) => {
        dot.classList.toggle("active", index === currentIndex);
    });
});

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

document.getElementById('calculatorIcon').addEventListener('click', () => {
    document.getElementById("calcPopup").style.display= 'flex';
    // selectNav('nav-recurring');
});

document.getElementById('menuOpen').addEventListener('click', () => {
    toggleMenu(1);
});

document.getElementById('menu-overlay').addEventListener('click', () => {
    toggleMenu(0);
});

document.getElementById('txn-overlay').addEventListener('click', () => {
    editDeleteTransaction(0);
});

document.getElementById('backHome').addEventListener('click', () => {
    showScreen('home-screen');
    selectNav('nav-home');
});

document.getElementById('close-alert').addEventListener('click', () => {
    document.getElementById("home-alert-container").style.display = 'none'
});

document.getElementById('dateDiv').addEventListener('click', () => {
    document.getElementById("transaction-date-sc01").showPicker()
});
document.getElementById('timeDiv').addEventListener('click', () => {
    document.getElementById("transaction-time-sc01").showPicker()
});
document.getElementById('transaction-time-sc01').addEventListener('change', () => {
    document.getElementById("transactionTimeSpan-sc01").textContent = document.getElementById('transaction-time-sc01').value;
});
document.getElementById('transaction-date-sc01').addEventListener('change', () => {
    document.getElementById("transactionDateSpan-sc01").textContent = document.getElementById('transaction-date-sc01').value;
});
