let login_form = document.getElementById("login-form");
login_form.addEventListener("submit",
    function (event) {
        event.preventDefault();
        let request = new XMLHttpRequest();
        request.onreadystatechange = function () {
            if (this.readyState === 4 && this.status === 200) {
                let feed_request = new XMLHttpRequest();
                feed_request.onreadystatechange = function () {
                    if (feed_request.readyState === 4 && feed_request.status === 200) {
                        let html = document.getElementsByTagName("html")[0];
                        html.innerHTML = this.responseText;
                        let script = document.createElement("script");
                        script.src="main.js";
                        document.getElementsByTagName("body")[0].appendChild(script);
                    }
                };
                feed_request.open("GET", "feed");
                feed_request.setRequestHeader("Token", "123");
                feed_request.send();
            }
        };
        request.open("POST", "login");
        let username = document.getElementById("username-input").value;
        let password = document.getElementById("password-input").value;
        request.send(JSON.stringify({username: username, password: password}));
    }, false);