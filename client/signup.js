(function () {
    let signup_form = document.getElementById("signup-form");
    signup_form.addEventListener("submit", function (e) {
        e.preventDefault();
        let request = new XMLHttpRequest();
        request.onreadystatechange = function () {
            if (this.readyState === 4 && this.status === 200) {
                document.getElementsByTagName("body")[0].innerHTML = "OK";
            }
        };
        request.open("POST", "signup");
        request.setRequestHeader("Content-Type", "application/json");
        let username = document.getElementById("username-input").value;
        let password = document.getElementById("password-input").value;
        let info = document.getElementById("info-input").value;
        request.send(JSON.stringify({username: username, password: password, info: info}));
    });
})();