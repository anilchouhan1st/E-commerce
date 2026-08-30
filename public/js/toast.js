function showToast(type, title, message) {
    const toast = document.querySelector(".custom-toast");
    const icon = toast.querySelector(".icon");
    const text1 = toast.querySelector(".text-1");
    const text2 = toast.querySelector(".text-2");
    const progress = toast.querySelector(".progress");
    const closeIcon = toast.querySelector(".close");

    // Reset previous state
    toast.classList.remove("success", "error", "warning", "info", "active");
    progress.classList.remove("active");

    // Set toast type
    toast.classList.add(type);

    // Set content
    text1.textContent = title;
    text2.textContent = message;

    // Set icon
    if (type === "success") {
        icon.className = "icon fa-solid fa-check";
    } else if (type === "error") {
        icon.className = "icon fa-solid fa-xmark";
    } else if (type === "warning") {
        icon.className = "icon fa-solid fa-triangle-exclamation";
    } else {
        icon.className = "icon fa-solid fa-circle-info";
    }

    // Show toast
    toast.classList.add("active");
    progress.classList.add("active");

    // Auto hide
    const timer1 = setTimeout(() => {
        toast.classList.remove("active");
    }, 5000);

    const timer2 = setTimeout(() => {
        progress.classList.remove("active");
    }, 5300);

    // Close button
    closeIcon.onclick = () => {
        toast.classList.remove("active");
        progress.classList.remove("active");

        clearTimeout(timer1);
        clearTimeout(timer2);
    };

    

}

window.addEventListener("DOMContentLoaded", () => {
  const toast = document.querySelector(".custom-toast");

  if (!toast) {
    return;
  }

  const { toastType, toastTitle, toastMessage } = toast.dataset;

  if (toastType) {
    showToast(toastType, toastTitle, toastMessage);
  }

  const params = new URLSearchParams(window.location.search);

  if (params.get("toast") === "logout") {
    showToast(
      "warning",
      "Logged Out",
      "You have been logged out successfully."
    );
  }
});

// if (params.get("toast") === "logout") {
//     showToast(
//         "warning",
//         "Logged Out",
//         "You have been logged out successfully."
//     );
// }