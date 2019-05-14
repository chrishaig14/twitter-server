var current_user = "";

function show_view(view) {
    let views = document.getElementsByClassName("view");

    for (let view of views) {
        view.style.display = "none";
    }

    let view_el = document.getElementById(view);
    view_el.style.display = "block";
}

function show_feed() {
    let feed_request = new XMLHttpRequest();
    feed_request.onreadystatechange = function () {
        if (feed_request.readyState === 4 && feed_request.status === 200) {
            console.log(feed_request.responseText);
            make_feed(JSON.parse(feed_request.responseText));
        }
    };
    feed_request.open("POST", "feed");
    feed_request.send(JSON.stringify({username: current_user}));
}

function make_post(post_data) {
    let post_template = document.getElementById("post-template");
    let post_clone = post_template.content.cloneNode(true);
    post_clone.children[0].getElementsByTagName("img")[0].src = "https://i.pravatar.cc/48";
    post_clone.children[0].getElementsByClassName("post-user")[0].innerHTML = post_data.username;
    post_clone.children[0].getElementsByClassName("post-content")[0].innerHTML = post_data.content;
    return post_clone;
}

function make_feed(feed_data) {
    show_view("view-feed");
    // console.log("feed data received:", feed_data);
    // let post_template = document.getElementById("post-template");
    // let post_clone = post_template.content.cloneNode(true);
    let post_container = document.getElementById("post-container");
    // post_clone.children[0].getElementsByTagName("img")[0].src = "https://i.pravatar.cc/48";
    // post_clone.children[0].getElementsByTagName("img")[0].id = x.toString();
    // console.log(post_clone.children[0]);
    // post_clone.children[0].getElementsByClassName("post-user")[0].innerHTML = feed_data.posts[0].username;
    // post_clone.children[0].getElementsByClassName("post-content")[0].innerHTML = feed_data.posts[0].content;
    // console.log(feed_data["posts"]);
    for (let post_data of feed_data.posts) {
        let post_clone = make_post(post_data);
        post_container.appendChild(post_clone);
    }
}

function setup_login() {
    let login_form = document.getElementById("login-form");

    login_form.addEventListener("submit",
        function (event) {
            event.preventDefault();
            let request = new XMLHttpRequest();
            request.onreadystatechange = function () {

                if (this.readyState === 4 && this.status === 200) {
                    console.log("LOGIN OK");
                    current_user = document.getElementById("login-username-input").value;
                    show_feed();
                } else {
                    let result = document.getElementById("login-result");

                    if (this.readyState === 4 && this.status === 204) {
                        result.style.visibility = "visible";
                        result.innerText = "ERROR: username doesn't exist or password is wrong.";
                        document.getElementById("username-input").value = "";
                        document.getElementById("password-input").value = "";
                        console.log("ERROR: username doesn't exist or password is wrong.");
                    } else if (this.readyState === 4 && this.status === 202) {
                        result.style.visibility = "visible";
                        result.innerText = "ERROR: unknown error";
                        console.log("ERROR: unknown error");
                    }
                }
            };
            request.open("POST", "login");
            let username = document.getElementById("login-username-input").value;
            let password = document.getElementById("login-password-input").value;
            request.send(JSON.stringify({username: username, password: password}));
        }, false);
    let signup_button = document.getElementById("sign-up-button");
    // console.log(signup_button);
    signup_button.addEventListener("click", () => {
        show_view("view-signup");
    });
}

function setup_signup() {
    let signup_form = document.getElementById("signup-form");
    signup_form.addEventListener("submit", function (e) {
        e.preventDefault();
        let request = new XMLHttpRequest();
        request.onreadystatechange = function () {
            if (this.readyState === 4 && this.status === 200) {
                show_view("view-login");
            }
        };
        request.open("POST", "signup");
        let username = document.getElementById("signup-username-input").value;
        let password = document.getElementById("signup-password-input").value;
        let info = document.getElementById("signup-info-input").value;
        request.send(JSON.stringify({username: username, password: password, info: info}));
    });
}

function setup_feed() {
    let new_post_form = document.getElementById("new-post-form");
    new_post_form.addEventListener("submit", function (e) {
        e.preventDefault();
        let new_post_content = document.getElementById("new-post-content");
        let request = new XMLHttpRequest();
        request.onreadystatechange = function () {
            if (this.readyState === 4 && this.status === 200) {
                let post_template = document.getElementById("post-template");
                let post_clone = post_template.content.cloneNode(true);
                let post_container = document.getElementById("post-container");
                let post_content = post_clone.children[0].getElementsByClassName("post-content")[0];
                post_content.innerHTML = new_post_content.value;
                document.getElementById("new-post").insertAdjacentElement("afterend", post_clone.children[0]);
                new_post_content.value = "";

            } else if (this.readyState === 4) {
                console.log("ERROR: could not post!");
            }
        };
        request.open("POST", "post");
        console.log(current_user);
        request.send(JSON.stringify({username: current_user, post: {content: new_post_content.value}}));
    });

    let search_form = document.getElementById("search-form");
    search_form.addEventListener("submit", function (e) {
        e.preventDefault();
        let search_term = document.getElementById("search-input").value;
        console.log("searching for: ", search_term);
        let request = new XMLHttpRequest();
        request.onreadystatechange = function () {
            if (this.readyState === 4) {
                console.log(this.responseText);
            }
        };
        request.open("POST", "search");
        request.send(JSON.stringify({search_term: search_term}));
    })
}

(function () {
    show_view("view-login");

    setup_login();

    setup_signup();

    setup_feed();

})();