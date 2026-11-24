document.addEventListener("DOMContentLoaded", function () {

    // FOOTER YEAR
    const yearElement = document.getElementById("currentYear");

    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }


    // SIDEBAR NAVIGATION
    const navLinks = document.querySelectorAll(".nav-link");

    navLinks.forEach(function (link) {
        link.addEventListener("click", function () {
            navLinks.forEach(item => item.classList.remove("active"));
            link.classList.add("active");
        });
    });


    // ACTIVE SECTION TRACKING
    const sections = document.querySelectorAll("main section[id]");

    const observer = new IntersectionObserver(function (entries) {

        entries.forEach(function (entry) {

            if (entry.isIntersecting) {

                navLinks.forEach(function (link) {
                    link.classList.remove("active");

                    if (link.getAttribute("href") === "#" + entry.target.id) {
                        link.classList.add("active");
                    }
                });

            }

        });

    }, {
        rootMargin: "-25% 0px -60% 0px"
    });

    sections.forEach(section => observer.observe(section));


    // MARKET DATA ELEMENTS
    const priceElement = document.getElementById("latestPrice");
    const highElement = document.getElementById("priceHigh");
    const lowElement = document.getElementById("priceLow");
    const changeElement = document.getElementById("priceChange");
    const volatilityElement = document.getElementById("volatilitySummary");
    const chartStatus = document.getElementById("chartStatus");

    let priceChart = null;


    // FORMAT USD
    function formatUSD(value) {

        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 2
        }).format(value);

    }


    // HISTORICAL VOLATILITY
    function calculateVolatility(prices) {

        const returns = [];

        for (let i = 1; i < prices.length; i++) {

            if (prices[i - 1] > 0 && prices[i] > 0) {

                const dailyReturn = Math.log(
                    prices[i] / prices[i - 1]
                );

                returns.push(dailyReturn);

            }

        }

        if (returns.length < 2) {
            return null;
        }

        const average =
            returns.reduce((sum, value) => sum + value, 0) /
            returns.length;

        const variance =
            returns.reduce((sum, value) => {
                return sum + Math.pow(value - average, 2);
            }, 0) / (returns.length - 1);

        const dailyStandardDeviation = Math.sqrt(variance);

        // Annualized volatility using 365 calendar days
        return dailyStandardDeviation * Math.sqrt(365) * 100;

    }


    // CREATE PRICE CHART
    function createPriceChart(labels, prices) {

        const canvas = document.getElementById("priceChart");

        if (!canvas) return;

        if (typeof Chart === "undefined") {

            chartStatus.textContent =
                "Chart library could not load. Please check your internet connection.";

            return;
        }

        if (priceChart) {
            priceChart.destroy();
        }

        const context = canvas.getContext("2d");

        const gradient = context.createLinearGradient(0, 0, 0, 300);

        gradient.addColorStop(0, "rgba(135, 247, 194, 0.24)");
        gradient.addColorStop(1, "rgba(135, 247, 194, 0.00)");

        priceChart = new Chart(context, {

            type: "line",

            data: {
                labels: labels,

                datasets: [{
                    label: "SOL Price (USD)",
                    data: prices,
                    borderColor: "#87f7c2",
                    backgroundColor: gradient,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    fill: true,
                    tension: 0.25
                }]
            },

            options: {

                responsive: true,
                maintainAspectRatio: false,

                interaction: {
                    intersect: false,
                    mode: "index"
                },

                plugins: {

                    legend: {
                        display: false
                    },

                    tooltip: {

                        backgroundColor: "#111728",
                        titleColor: "#87f7c2",
                        bodyColor: "#ffffff",
                        padding: 12,
                        displayColors: false,

                        callbacks: {

                            label: function (context) {
                                return " Price: " + formatUSD(context.raw);
                            }

                        }

                    }

                },

                scales: {

                    x: {
                        grid: {
                            display: false
                        },

                        ticks: {
                            color: "#929bb2",
                            maxTicksLimit: 8,
                            maxRotation: 0
                        }
                    },

                    y: {
                        grid: {
                            color: "rgba(255,255,255,0.06)"
                        },

                        ticks: {
                            color: "#929bb2",

                            callback: function (value) {
                                return "$" + value;
                            }
                        }
                    }

                }

            }

        });

    }


    // FETCH SOL MARKET DATA
    async function loadMarketData() {

        try {

            chartStatus.textContent =
                "Loading historical market data...";

            const apiURL =
                "https://api.coingecko.com/api/v3/coins/solana/market_chart?vs_currency=usd&days=365";

            const response = await fetch(apiURL);

            if (!response.ok) {
                throw new Error("Market API returned an error.");
            }

            const data = await response.json();

            if (!data.prices || data.prices.length < 2) {
                throw new Error("Historical price data is unavailable.");
            }

            const prices = data.prices.map(item => item[1]);

            const timestamps = data.prices.map(item => item[0]);

            const latestPrice = prices[prices.length - 1];

            const highestPrice = Math.max(...prices);

            const lowestPrice = Math.min(...prices);

            const firstPrice = prices[0];

            const percentageChange =
                ((latestPrice - firstPrice) / firstPrice) * 100;


            // UPDATE MARKET CARDS
            priceElement.textContent = formatUSD(latestPrice);

            highElement.textContent = formatUSD(highestPrice);

            lowElement.textContent = formatUSD(lowestPrice);

            changeElement.textContent =
                (percentageChange >= 0 ? "+" : "") +
                percentageChange.toFixed(2) + "%";

            changeElement.style.color =
                percentageChange >= 0 ? "#87f7c2" : "#ff8297";


            // CALCULATE HISTORICAL VOLATILITY
            const volatility = calculateVolatility(prices);

            if (volatility !== null) {

                volatilityElement.textContent =
                    "Annualized historical volatility: " +
                    volatility.toFixed(2) +
                    "%. This estimate is calculated from daily log returns.";

            } else {

                volatilityElement.textContent =
                    "Not enough historical data to calculate volatility.";

            }


            // CHART LABELS
            const labels = timestamps.map(function (timestamp) {

                return new Date(timestamp).toLocaleDateString("en-US", {
                    month: "short",
                    year: "2-digit"
                });

            });


            // CREATE CHART
            createPriceChart(labels, prices);

            chartStatus.textContent =
                "Data source: CoinGecko | Historical daily prices | " +
                new Date().toLocaleString();

        } catch (error) {

            console.error("Market data error:", error);

            priceElement.textContent = "Unavailable";
            highElement.textContent = "Unavailable";
            lowElement.textContent = "Unavailable";
            changeElement.textContent = "Unavailable";

            volatilityElement.textContent =
                "Historical volatility cannot be calculated because market data is currently unavailable.";

            chartStatus.textContent =
                "Unable to load live data. Please refresh later or check your internet connection.";

        }

    }


    // START MARKET DATA
    loadMarketData();

});