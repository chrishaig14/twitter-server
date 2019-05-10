let post_template = document.getElementById("post-template");

for(let x = 0; x < 5; x++) {
    let post_clone = post_template.content.cloneNode(true);
    let post_container = document.getElementById("post-container");
    post_clone.children[0].getElementsByTagName("img")[0].src="https://i.pravatar.cc/48";
    post_clone.children[0].getElementsByTagName("img")[0].id = x.toString();
    post_container.appendChild(post_clone);
}

let post_form = document.getElementById("new-post-form");
post_form.addEventListener("submit", function (e) {
    e.preventDefault();
    let new_post_content = document.getElementById("new-post-content");

    let request = new XMLHttpRequest();
    request.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
            let post_clone = post_template.content.cloneNode(true);
            let post_container = document.getElementById("post-container");
            let post_content = post_clone.children[0].getElementsByClassName("post-content")[0];
            post_content.innerHTML = new_post_content.value;
            document.getElementById("new-post").insertAdjacentElement("afterend", post_clone.children[0]);
        }
    };

    request.open("POST", "/post");
    console.log(new_post_content.value);
    request.send(new_post_content.value);

});