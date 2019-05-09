let post_template = document.getElementById("post-template");
for(let x = 0; x < 5; x++) {
    let post_clone = post_template.content.cloneNode(true);
    let post_container = document.getElementById("post-container");
    post_clone.children[0].getElementsByTagName("img")[0].src="https://i.pravatar.cc/48";
    post_clone.children[0].getElementsByTagName("img")[0].id = x.toString();
    post_container.appendChild(post_clone);
}