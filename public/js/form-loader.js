function setupLoadingButton(formId, buttonId, loadingText) {

    const form = document.getElementById(formId);
    const button = document.getElementById(buttonId);

    if (!form || !button) return;

    form.addEventListener("submit", () => {
        button.disabled = true;
        button.innerHTML = `
            <span class="spinner"></span>
            ${loadingText}
        `;
    });

}