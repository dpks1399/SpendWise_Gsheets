function scCalcAppendValue(value) {
    document.getElementById('sc-calc-display').value += value;
}
function scCalcClearDisplay() {
    document.getElementById('sc-calc-display').value = '';
}
function scCalcBackspace() {
    let display = document.getElementById('sc-calc-display');
    display.value = display.value.slice(0, -1);
}
function scCalcCalculate() {
    try {
        let exp = document.getElementById('sc-calc-display').value;
        if(exp == ''){
            document.getElementById('sc-calc-display').value = 0; 
        }
        else{
            if(exp[0] == '0'){
                exp = exp.replace(/^0+/, "");
            }
            document.getElementById('sc-calc-display').value = eval(exp);
        }
        
    } catch {
        document.getElementById('sc-calc-display').value = 'Error';
    }
}
function scCalcLogFinalValue() {
    res = eval(document.getElementById('sc-calc-display').value);
    document.getElementById('amount-sc01').value = res;
    document.getElementById('sc-calc-display').value = '';
    document.getElementById("calcPopup").style.display= 'none';
    console.log(document.getElementById('sc-calc-display').value);
}