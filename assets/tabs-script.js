// assets/tabs-script.js

document.addEventListener("DOMContentLoaded", () => {

    document.querySelectorAll("[data-tabs]").forEach(container => {

        const tabs   = [...container.querySelectorAll("[data-tab]")];
        const panels = [...container.querySelectorAll("[data-tab-panel]")];

        if (!tabs.length || !panels.length) return;

        // Ensure matching tab/panel counts
        const count = Math.min(tabs.length, panels.length);

        const activate = (index) => {
            for (let i = 0; i < count; i++) {
                const selected = i === index;
                tabs[i].setAttribute("aria-selected", String(selected));
                tabs[i].setAttribute("tabindex", selected ? "0" : "-1");
                panels[i].hidden = !selected;
            }
            tabs[index].focus();
        };

        // Setup ARIA roles
        const tablist = container.querySelector("[data-tab-list]");
        if (tablist) {
            tablist.setAttribute("role", "tablist");
        }

        for (let i = 0; i < count; i++) {
            const tab = tabs[i];
            const panel = panels[i];

            // Unique IDs for ARIA linking
            const tabId = `tab-${container.getAttribute("data-tabs")}-${i}`;
            const panelId = `panel-${container.getAttribute("data-tabs")}-${i}`;

            tab.setAttribute("role", "tab");
            tab.setAttribute("id", tabId);
            tab.setAttribute("aria-controls", panelId);
            tab.setAttribute("aria-selected", "false");
            tab.setAttribute("tabindex", "-1");

            panel.setAttribute("role", "tabpanel");
            panel.setAttribute("id", panelId);
            panel.setAttribute("aria-labelledby", tabId);
            panel.hidden = true;

            tab.addEventListener("click", () => activate(i));

            tab.addEventListener("keydown", (e) => {
                let newIndex = null;

                if (e.key === "ArrowRight") newIndex = (i + 1) % count;
                if (e.key === "ArrowLeft")  newIndex = (i - 1 + count) % count;
                if (e.key === "Home")       newIndex = 0;
                if (e.key === "End")        newIndex = count - 1;

                if (newIndex !== null) {
                    e.preventDefault();
                    activate(newIndex);
                }
            });
        }

        // Activate first tab or one marked with data-tab-init
        const initIndex = tabs.findIndex(t => t.hasAttribute("data-tab-init"));
        activate(initIndex >= 0 ? initIndex : 0);

    });

});
