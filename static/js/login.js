
function signup(){

    let name = document.getElementById('su-name').value;
    let email = document.getElementById('su-email').value;
    let pass = document.getElementById('su-password').value;
    let rpass = document.getElementById('su-cnfpassword').value;

    if(!name){alert("Name cannot be empty"); return;}
    if(!email){alert("Email cannot be empty"); return;}
    if(!pass){alert("Password cannot be empty"); return;}
    if(pass.length < 8){alert("Password cannot be less than 8 characters"); return;}
    if(pass != rpass){alert("Passwords do not match"); return;}

    data = {
        "name" : name,
        "email" : email,
        "password": pass
    };

    fetch('/api/signup', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        console.log('Response from Flask:', data["status"], data["result"]);
        if(data["status"]=="success"){
            console.log('success');
        } else {
            console.log('error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        // Handle errors
    });
}


document.getElementById('gotoSignup').addEventListener('click', () => {
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('signupContainer').style.display = 'flex';
});

document.getElementById('gotoLogin').addEventListener('click', () => {
    document.getElementById('signupContainer').style.display = 'none';
    document.getElementById('loginContainer').style.display = 'flex';
});

document.getElementById('signupBtn').addEventListener('click', () => {
    signup();
});

document.getElementById('loginBtn').addEventListener('click', () => {
    login();
});