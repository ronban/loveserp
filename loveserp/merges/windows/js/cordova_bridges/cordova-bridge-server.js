/* This file is injected into the webpage after DOM is loaded */
/* Plugin client proxy function implementation will go here */
/*var originalWindowOpen = window.open;
window.open = function (url)
{
    console.log("capture window.open");
    originalWindowOpen(url, "_self"); // open in webview. If content is not html, the webview throws an UnviewableContent error and can be handled by the code. 
}*/

// Handle <a href="..."> without the target attribute.
document.addEventListener('click',function(e){
    e = e ||  window.event;
    var element = e.target || e.srcElement;
    if (element.href) {
            if (element.tagName == 'A' && (element.href.indexOf("http") === 0 || element.href.indexOf("https") === 0) && element.target == "_blank")            {
                e.preventDefault();
                var handleWnd = window.open(element.href, element.target);
        }
    }
    return true;
});