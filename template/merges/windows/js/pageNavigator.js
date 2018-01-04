/* Used to handle page i.e. div transitions on Windows Phone 8.1 */

/* Called when the view-log screen is displayed */
function showLogScreen() {
	fireEvent("showLogScreen");
}

/* called when the user presses the back button on the log screen */
function exitLogScreen() {
	fireEvent("exitLogScreen");
}

// Manages div transitions and animated them.
// @param entry the div that should be displayed.
// @param exit the div that should not be displayed. 
function transition(entry, exit) {
	exit.style.display = "none";
	// we need for block (instead of inline), beacuse the scrollbar doesn't work on the settings and log screens
	entry.style.display = "block"; 	
	//WinJS.UI.Animation.enterContent(entry);
}