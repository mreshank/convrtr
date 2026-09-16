import React from "react";
import ReactDOM from "react-dom/client";
import { ExtensionApp } from "./ExtensionApp";

const container = document.getElementById("root");
if (container) {
	ReactDOM.createRoot(container).render(
		<React.StrictMode>
			<ExtensionApp mode="sidepanel" />
		</React.StrictMode>,
	);
}
