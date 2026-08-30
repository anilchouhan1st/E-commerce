const password = document.getElementById("password");
const rules = document.getElementById("password-rules");

password.addEventListener("focus", () => {
    rules.style.display = "block";
});

password.addEventListener("blur", () => {
    if (password.value === "") {
        rules.style.display = "none";
    } else if (allValid(password.value)) {
        rules.style.display = "none";
    } else {
        rules.style.display = "block";
    }
});

// Update password rules while typing
password.addEventListener("input", () => {
    const value = password.value;

    updateRule("length", value.length >= 8);
    updateRule("upper", /[A-Z]/.test(value));
    updateRule("lower", /[a-z]/.test(value));
    updateRule("number", /[0-9]/.test(value));
    updateRule("special", /[^A-Za-z0-9]/.test(value));
    if (!allValid(value)) {
        rules.style.display = "block";
    }

});

// Check if all password requirements are met
function allValid(value) {
    return (
        value.length >= 8 &&
        /[A-Z]/.test(value) &&
        /[a-z]/.test(value) &&
        /[0-9]/.test(value) &&
        /[^A-Za-z0-9]/.test(value)
    );
}

// Update a single rule
function updateRule(id, valid) {
    const rule = document.getElementById(id);

    const text = rule.textContent.substring(2);

    if (valid) {
        rule.classList.add("valid");
        rule.textContent = "✅ " + text;
    } else {
        rule.classList.remove("valid");
        rule.textContent = "❌ " + text;
    }
}