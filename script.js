document.getElementById("planForm").addEventListener("submit", function(e) {
    e.preventDefault();
    const plan = document.getElementById("plan").value;
    window.location.href = `planes/${plan}.html`;
});

