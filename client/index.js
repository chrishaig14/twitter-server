(function () {
    let login_form = document.getElementById("login-form");
    login_form.addEventListener("submit",
        function (event) {
            event.preventDefault();
            let request = new XMLHttpRequest();
            request.onreadystatechange = function () {
                console.log("ready:", this.readyState);
                console.log("status:", this.status);
                console.log("response:", this.responseText);
                if (this.readyState === 4 && this.status === 200) {
                    let feed_request = new XMLHttpRequest();
                    feed_request.onreadystatechange = function () {
                        if (feed_request.readyState === 4 && feed_request.status === 200) {
                            let html = document.getElementsByTagName("html")[0];
                            html.innerHTML = feed_request.responseText;
                            let script = document.createElement("script");
                            script.src = "feed.js";
                            document.getElementsByTagName("body")[0].appendChild(script);
                        }
                    };
                    feed_request.open("GET", "feed");
                    feed_request.setRequestHeader("Token", "123");
                    feed_request.send();
                } else {
                    let result = document.getElementById("login-result");
                    result.style.visibility = "visible";
                    if (this.readyState === 4 && this.status === 204) {
                        result.innerText = "ERROR: username doesn't exist or password is wrong.";
                        document.getElementById("username-input").value = "";
                        document.getElementById("password-input").value = "";
                        console.log("ERROR: username doesn't exist or password is wrong.");
                    } else if (this.readyState === 4 && this.status === 202) {
                        result.innerText = "ERROR: unknown error";
                        console.log("ERROR: unknown error");
                    }
                }
            };
            request.open("POST", "login");
            let username = document.getElementById("username-input").value;
            let password = document.getElementById("password-input").value;
            request.send(JSON.stringify({username: username, password: password}));
        }, false);

    let sign_up_button = document.getElementById("sign-up-button");
    sign_up_button.addEventListener("click", function () {
        let request = new XMLHttpRequest();
        request.onreadystatechange = function () {
            if (this.readyState === 4 && this.status === 200) {
                let html = document.getElementsByTagName("html")[0];
                html.innerHTML = this.responseText;
                let script = document.createElement("script");
                script.src = "signup.js";
                document.getElementsByTagName("body")[0].appendChild(script);
            }
        };
        request.open("GET", "signup");
        request.send();
    });
})();