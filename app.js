// Reference Cities with actual GHSL-aligned profiles (population, area in km2, baseline EV share)
const referenceCities = {
    "New York": { country: "United States", pop: 19426000, area: 11280, ev: 2 },
    "Tokyo": { country: "Japan", pop: 37400000, area: 8547, ev: 1 },
    "Osaka": { country: "Japan", pop: 19000000, area: 3200, ev: 1 },
    "Hamamatsu": { country: "Japan", pop: 790000, area: 650, ev: 1 },
    "Tosu": { country: "Japan", pop: 74000, area: 72, ev: 1 },
    "Sydney": { country: "Australia", pop: 5100000, area: 2037, ev: 2 },
    "Melbourne": { country: "Australia", pop: 4900000, area: 2453, ev: 2 },
    "Toronto": { country: "Canada", pop: 6200000, area: 2300, ev: 2 },
    "Vancouver": { country: "Canada", pop: 2600000, area: 1150, ev: 2 },
    "London": { country: "United Kingdom", pop: 9000000, area: 1600, ev: 3 },
    "Paris": { country: "France", pop: 11000000, area: 2845, ev: 2 },
    "Amsterdam": { country: "Netherlands", pop: 1100000, area: 320, ev: 5 },
    "Dhaka": { country: "Bangladesh", pop: 22400000, area: 450, ev: 0 },
    "Rosarito": { country: "México", pop: 126000, area: 55, ev: 0 },
    "Los Angeles": { country: "United States", pop: 12500000, area: 6850, ev: 3 }
};

// Application state
let cufetData = null;
let activeCountry = "";
let activeCity = "";
let chartVkt = null;
let chartCo2 = null;
let animationId = null;

// DOM Elements
const countrySelect = document.getElementById("country-select");
const citySelect = document.getElementById("city-select");
const customCityGroup = document.getElementById("custom-city-group");
const cityNameInput = document.getElementById("city-name-input");

const popSlider = document.getElementById("pop-slider");
const popVal = document.getElementById("pop-val");
const areaSlider = document.getElementById("area-slider");
const areaVal = document.getElementById("area-val");
const baselineDensityText = document.getElementById("baseline-density");

const evSlider = document.getElementById("ev-slider");
const evVal = document.getElementById("ev-val");
const compactnessSlider = document.getElementById("compactness-slider");
const compactnessVal = document.getElementById("compactness-val");
const targetEvSlider = document.getElementById("target-ev-slider");
const targetEvVal = document.getElementById("target-ev-val");

// Metric Elements
const currentVktEl = document.getElementById("metric-current-vkt");
const proposedVktEl = document.getElementById("metric-proposed-vkt");
const vktReductionEl = document.getElementById("vkt-reduction-pct");

const currentCo2El = document.getElementById("metric-current-co2");
const proposedCo2El = document.getElementById("metric-proposed-co2");
const co2ReductionEl = document.getElementById("co2-reduction-pct");

const currentCapitaEl = document.getElementById("metric-current-capita");
const proposedCapitaEl = document.getElementById("metric-proposed-capita");
const capitaSubText = document.getElementById("capita-sub-text");
const capitaCard = document.getElementById("capita-card");

const gaugeFill = document.getElementById("gauge-fill");
const gaugeText = document.getElementById("gauge-text");

// Details Elements
const sizeBandDesc = document.getElementById("size-band-desc");
const badgeSizeCat = document.getElementById("badge-size-cat");
const badgeDensityElas = document.getElementById("badge-density-elas");
const badgePopElas = document.getElementById("badge-pop-elas");
const geoEffectsDesc = document.getElementById("geo-effects-desc");
const badgeCountryFe = document.getElementById("badge-country-fe");
const badgeEmissionIntensity = document.getElementById("badge-emission-intensity");

// Canvas setup
const canvas = document.getElementById("density-canvas");
const ctx = canvas.getContext("2d");

// Helper: Format numbers
function formatNumber(num, decimals = 0) {
    if (num >= 1e9) {
        return (num / 1e9).toFixed(decimals + 1) + " B";
    }
    if (num >= 1e6) {
        return (num / 1e6).toFixed(decimals + 1) + " M";
    }
    if (num >= 1e3) {
        return num.toLocaleString(undefined, { maximumFractionDigits: decimals });
    }
    return num.toFixed(decimals);
}

// Load dataset
async function loadData() {
    try {
        const response = await fetch("cufet_data_compact.json");
        cufetData = await response.json();
        initializeUI();
    } catch (error) {
        console.error("Failed to load CUFET dataset:", error);
        alert("Error loading application data. Please ensure the JSON file exists.");
    }
}

// Initialize Dropdowns
function initializeUI() {
    // Populate Countries
    const sortedCountries = Object.keys(cufetData.countries).sort();
    sortedCountries.forEach(country => {
        const option = document.createElement("option");
        option.value = country;
        option.textContent = country;
        countrySelect.appendChild(option);
    });

    // Set Default: United States
    countrySelect.value = "United States";
    handleCountryChange();

    // Set Default City: New York (reference city)
    citySelect.value = "New York";
    handleCityChange();

    // Event listeners
    countrySelect.addEventListener("change", handleCountryChange);
    citySelect.addEventListener("change", handleCityChange);
    cityNameInput.addEventListener("input", handleInputChange);

    popSlider.addEventListener("input", () => {
        popVal.textContent = parseInt(popSlider.value).toLocaleString();
        handleInputChange();
    });

    areaSlider.addEventListener("input", () => {
        areaVal.textContent = `${parseInt(areaSlider.value).toLocaleString()} km²`;
        handleInputChange();
    });

    evSlider.addEventListener("input", () => {
        evVal.textContent = `${evSlider.value}%`;
        // Clamp Target EV to be at least Current EV
        if (parseInt(targetEvSlider.value) < parseInt(evSlider.value)) {
            targetEvSlider.value = evSlider.value;
            targetEvVal.textContent = `${targetEvSlider.value}%`;
        }
        handleInputChange();
    });

    compactnessSlider.addEventListener("input", () => {
        const val = parseInt(compactnessSlider.value);
        compactnessVal.textContent = val === 0 ? "Baseline (0%)" : `+${val}% (${(1 + val/100).toFixed(1)}x Density)`;
        handleInputChange();
    });

    targetEvSlider.addEventListener("input", () => {
        // Clamp Target EV to be at least Current EV
        if (parseInt(targetEvSlider.value) < parseInt(evSlider.value)) {
            targetEvSlider.value = evSlider.value;
        }
        targetEvVal.textContent = `${targetEvSlider.value}%`;
        handleInputChange();
    });

    // Initialize Charts
    initCharts();

    // Initialize City Simulation Loop
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    startSimulationLoop();
}

// Handle Country Change
function handleCountryChange() {
    activeCountry = countrySelect.value;
    
    // Clear cities dropdown, keep the "Custom" option
    citySelect.innerHTML = '<option value="">-- Custom / Manual --</option>';
    
    // Add reference cities that match the selected country
    Object.keys(referenceCities).forEach(city => {
        if (referenceCities[city].country === activeCountry) {
            const option = document.createElement("option");
            option.value = city;
            option.textContent = `${city} (Reference City)`;
            citySelect.appendChild(option);
        }
    });

    // Add remaining GHSL cities
    const citiesList = cufetData.country_cities[activeCountry] || [];
    citiesList.forEach(city => {
        // Skip if already added as reference city
        if (referenceCities[city] && referenceCities[city].country === activeCountry) {
            return;
        }
        const option = document.createElement("option");
        option.value = city;
        option.textContent = city;
        citySelect.appendChild(option);
    });

    // Select manual by default if no reference city
    if (citySelect.options.length > 1) {
        citySelect.selectedIndex = 1; // Pick the first city in list
    } else {
        citySelect.value = "";
    }
    
    handleCityChange();
}

// Handle City Change
function handleCityChange() {
    activeCity = citySelect.value;
    
    if (activeCity && referenceCities[activeCity]) {
        // Load reference city data
        const profile = referenceCities[activeCity];
        popSlider.value = profile.pop;
        areaSlider.value = profile.area;
        evSlider.value = profile.ev;
        targetEvSlider.value = Math.max(profile.ev, 20); // target default
        
        // Update slider value badges
        popVal.textContent = profile.pop.toLocaleString();
        areaVal.textContent = `${profile.area.toLocaleString()} km²`;
        evVal.textContent = `${profile.ev}%`;
        targetEvVal.textContent = `${targetEvSlider.value}%`;
        
        customCityGroup.style.display = "none";
        cityNameInput.value = activeCity;
    } else if (activeCity) {
        // Non-reference city from GHSL list
        customCityGroup.style.display = "none";
        cityNameInput.value = activeCity;
        // Keep sliders as is but reset target EV default to something reasonable
        targetEvSlider.value = Math.max(parseInt(evSlider.value), 20);
        targetEvVal.textContent = `${targetEvSlider.value}%`;
    } else {
        // Manual input
        customCityGroup.style.display = "flex";
        if (cityNameInput.value === activeCity || cityNameInput.value === "") {
            cityNameInput.value = "Custom City";
        }
    }
    
    handleInputChange();
}

// Recalculate and update UI when inputs change
function handleInputChange() {
    if (!cufetData) return;

    // Get current form values
    const pop = parseInt(popSlider.value);
    const area = parseInt(areaSlider.value);
    const evShare = parseInt(evSlider.value);
    const compactness = parseInt(compactnessSlider.value);
    const targetEvShare = parseInt(targetEvSlider.value);

    // Baseline calculation
    const baselineResults = calculateCUFET(activeCountry, cityNameInput.value, pop, area, evShare);
    
    // Scenario calculation (compact form shrinks area, keeps population)
    const proposedArea = area / (1 + compactness / 100);
    const proposedResults = calculateCUFET(activeCountry, cityNameInput.value, pop, proposedArea, targetEvShare);

    // Update UI elements
    updateDashboard(baselineResults, proposedResults, pop, area, proposedArea, compactness);
}

// Core CUFET Regression Model Calculation
function calculateCUFET(country, city, pop, area, evShare) {
    const model = cufetData.model;
    const density = pop / area;
    
    // 1. Determine size category
    let sizeCategory = "Large";
    if (pop < model.threshold_sm) {
        sizeCategory = "Small";
    } else if (pop < model.threshold_ml) {
        sizeCategory = "Medium";
    }

    // 2. Fetch coefficients for the size category
    const band = model.bands[sizeCategory];
    const interceptDev = band.intercept_dev;
    const slopePop = band.slope_pop;
    const slopeDensity = band.slope_density;

    // 3. Country Fixed Effect FE
    const countryData = cufetData.countries[country] || { fe: 0, ei: 226.2 };
    const countryFe = countryData.fe;

    // 4. Calculate predicted log VKT
    const lnPop = Math.log(pop);
    const lnDensity = Math.log(density);
    const predictedLnVkt = model.global_intercept + countryFe + interceptDev + (lnPop * slopePop) + (lnDensity * slopeDensity);
    
    // 5. Linear VKT
    const predictedVkt = Math.exp(predictedLnVkt);

    // 6. ICE VKT (evShare subtracts activity from gasoline VKT)
    const iceVkt = predictedVkt * (1 - evShare / 100);

    // 7. Get Emission Intensity (EI)
    // Lookup City|Country first
    const cityKey = `${city}|${country}`;
    let emissionIntensity = cufetData.city_custom_ei[cityKey];
    let eiSource = "City Custom";

    if (emissionIntensity === undefined) {
        emissionIntensity = countryData.ei !== undefined ? countryData.ei : 226.2;
        eiSource = countryData.ei !== undefined ? "Country Default" : "Global Default";
    }

    // 8. Total emissions in tonnes CO2e
    const totalCO2e = (iceVkt * emissionIntensity) / 1000000;
    const co2ePerCapita = totalCO2e / pop;
    const vktPerCapita = predictedVkt / pop;

    return {
        pop,
        area,
        density,
        sizeCategory,
        slopePop,
        slopeDensity,
        countryFe,
        emissionIntensity,
        eiSource,
        vkt: predictedVkt,
        iceVkt,
        totalCO2e,
        co2ePerCapita,
        vktPerCapita
    };
}

// Update Dashboard metrics and visuals
function updateDashboard(baseline, proposed, pop, baselineArea, proposedArea, compactness) {
    // 1. Text readings
    baselineDensityText.textContent = `${Math.round(baseline.density).toLocaleString()} / km²`;
    
    // VKT Card
    currentVktEl.textContent = formatNumber(baseline.vkt, 0);
    proposedVktEl.textContent = formatNumber(proposed.vkt, 0);
    const vktDiffPct = ((proposed.vkt - baseline.vkt) / baseline.vkt) * 100;
    vktReductionEl.textContent = `${vktDiffPct.toFixed(1)}% reduction`;

    // CO2e Card
    currentCo2El.textContent = formatNumber(baseline.totalCO2e, 0) + " t";
    proposedCo2El.textContent = formatNumber(proposed.totalCO2e, 0) + " t";
    const co2DiffPct = ((proposed.totalCO2e - baseline.totalCO2e) / baseline.totalCO2e) * 100;
    co2ReductionEl.textContent = `${co2DiffPct.toFixed(1)}% reduction`;

    // Capita Card
    currentCapitaEl.textContent = baseline.co2ePerCapita.toFixed(2) + " t";
    proposedCapitaEl.textContent = proposed.co2ePerCapita.toFixed(2) + " t";
    
    // Carbon target checking (2.0 tonnes threshold)
    const carbonTarget = 2.0;
    const isTargetMet = proposed.co2ePerCapita <= carbonTarget;
    
    capitaCard.className = "metric-card glass-card span-2 highlight-metric-card";
    if (proposed.co2ePerCapita > 2.0) {
        capitaCard.classList.add("red-alert");
        gaugeText.textContent = "Fail";
        gaugeText.style.color = "var(--color-danger)";
        capitaSubText.textContent = "Exceeds transport carbon budget limit (>2.0 t)";
    } else if (proposed.co2ePerCapita > 1.5) {
        capitaCard.classList.add("warn-alert");
        gaugeText.textContent = "Warn";
        gaugeText.style.color = "var(--color-warning)";
        capitaSubText.textContent = "Within caution threshold of transport budget";
    } else {
        gaugeText.textContent = "Pass";
        gaugeText.style.color = "var(--color-safe)";
        capitaSubText.textContent = "Transport emissions align with global climate budget";
    }

    // Update circular gauge
    const capPct = Math.min((proposed.co2ePerCapita / carbonTarget) * 100, 100);
    // Draw progress ring by rotation
    const rotationDeg = (capPct / 100) * 360;
    gaugeFill.style.transform = `rotate(${rotationDeg}deg)`;

    // 2. Explanations Panel
    sizeBandDesc.innerHTML = `This city is classified under the <strong>${baseline.sizeCategory} Size Band</strong> based on its population of <strong>${pop.toLocaleString()}</strong>.<br>
    In this band, the <strong>density elasticity is ${baseline.slopeDensity.toFixed(3)}</strong>, meaning that a 1% increase in population density results in a <strong>${Math.abs(baseline.slopeDensity * 100).toFixed(2)}% decrease</strong> in annual VKT per capita.`;
    
    badgeSizeCat.textContent = baseline.sizeCategory;
    badgeDensityElas.textContent = baseline.slopeDensity.toFixed(3);
    badgePopElas.textContent = baseline.slopePop.toFixed(3);

    geoEffectsDesc.innerHTML = `For <strong>${activeCountry}</strong>, the country fixed effect coefficient is <strong>${baseline.countryFe.toFixed(3)}</strong>. This factor represents structural dependencies (such as public transportation infrastructure, transit access, fuel prices, and cultural factors) that shift baseline driving habits.<br>
    The emission intensity of the grid/fleet is <strong>${baseline.emissionIntensity.toFixed(1)} g CO₂e/km</strong> (Source: ${baseline.eiSource}).`;

    badgeCountryFe.textContent = baseline.countryFe.toFixed(3);
    badgeEmissionIntensity.textContent = `${baseline.emissionIntensity.toFixed(1)} g/km`;

    // 3. Update Charts
    updateCharts(baseline, proposed);

    // 4. Update Canvas Overlay Text
    document.getElementById("compactness-overlay-text").textContent = compactness === 0 ? "Sprawl baseline" : `+${compactness}% Density`;
}

// Charts Initialization
function initCharts() {
    const ctxVkt = document.getElementById("chart-vkt").getContext("2d");
    const ctxCo2 = document.getElementById("chart-co2").getContext("2d");

    const chartConfig = {
        type: 'bar',
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#9ca3af', font: { size: 10 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#9ca3af', font: { size: 10 } }
                }
            }
        }
    };

    // VKT Chart
    chartVkt = new Chart(ctxVkt, {
        ...chartConfig,
        data: {
            labels: ['Baseline', 'Proposed'],
            datasets: [{
                data: [0, 0],
                backgroundColor: ['#3b82f6', '#10b981'],
                borderRadius: 6,
                borderWidth: 0,
                barThickness: 45
            }]
        },
        options: {
            ...chartConfig.options,
            plugins: {
                title: {
                    display: true,
                    text: 'Annual VKT comparison',
                    color: '#f3f4f6',
                    font: { size: 12, family: 'Outfit', weight: '600' }
                },
                legend: { display: false }
            }
        }
    });

    // CO2 Chart
    chartCo2 = new Chart(ctxCo2, {
        ...chartConfig,
        data: {
            labels: ['Baseline', 'Proposed'],
            datasets: [{
                data: [0, 0],
                backgroundColor: ['#475569', '#10b981'],
                borderRadius: 6,
                borderWidth: 0,
                barThickness: 45
            }]
        },
        options: {
            ...chartConfig.options,
            plugins: {
                title: {
                    display: true,
                    text: 'Total emissions (t CO₂e)',
                    color: '#f3f4f6',
                    font: { size: 12, family: 'Outfit', weight: '600' }
                },
                legend: { display: false }
            }
        }
    });
}

// Update Charts Data
function updateCharts(baseline, proposed) {
    if (!chartVkt || !chartCo2) return;

    chartVkt.data.datasets[0].data = [baseline.vkt, proposed.vkt];
    chartVkt.update();

    chartCo2.data.datasets[0].data = [baseline.totalCO2e, proposed.totalCO2e];
    chartCo2.update();
}

// Canvas Visualizer Engine: Dynamic Sprawl vs Compact Form Animation
let particles = [];
let roadGrid = [];
let buildSpots = [];
let borderScale = 1.0;

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = 250 * window.devicePixelRatio;
    
    // Regrid roads and buildings
    initializeCityLayout();
}

function initializeCityLayout() {
    const w = canvas.width;
    const h = canvas.height;
    
    // Define a 2D layout grid for buildings
    buildSpots = [];
    const cols = 24;
    const rows = 12;
    const spacingX = w / cols;
    const spacingY = h / rows;
    
    for (let c = 1; c < cols; c++) {
        for (let r = 1; r < rows; r++) {
            // Give each spot coordinates and offsets
            buildSpots.push({
                x: c * spacingX,
                y: r * spacingY,
                offsetX: (Math.random() - 0.5) * (spacingX * 0.4),
                offsetY: (Math.random() - 0.5) * (spacingY * 0.4),
                size: 6 + Math.random() * 6,
                type: Math.random() > 0.85 ? 'high' : 'low',
                visible: true
            });
        }
    }

    // Set up particles representing cars / citizens moving on roads
    particles = [];
    const carCount = 45;
    for (let i = 0; i < carCount; i++) {
        particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            speed: 0.5 + Math.random() * 1.5,
            dir: Math.random() > 0.5 ? 'h' : 'v',
            color: Math.random() > 0.8 ? '#10b981' : '#64748b' // some EVs (green), some normal (grey)
        });
    }
}

function startSimulationLoop() {
    function animate() {
        drawCityGrid();
        animationId = requestAnimationFrame(animate);
    }
    animate();
}

function drawCityGrid() {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    
    // Retrieve target parameters
    const compactness = parseInt(compactnessSlider.value);
    const targetEv = parseInt(targetEvSlider.value);
    
    // Scale representation (compact form pulls building layout closer to center)
    // compactness of 300% means 4x density, so dimensions shrink to 1/2 of baseline
    const targetScale = 1.0 / Math.sqrt(1 + compactness / 100);
    borderScale += (targetScale - borderScale) * 0.08; // smooth easing

    const centerX = w / 2;
    const centerY = h / 2;

    // Draw boundary box (urban bounds)
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(
        centerX - (w / 2 * 0.85) * borderScale,
        centerY - (h / 2 * 0.8) * borderScale,
        w * 0.85 * borderScale,
        h * 0.8 * borderScale
    );
    ctx.setLineDash([]);

    // Draw grid roads
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.lineWidth = 1;
    // Horizontal roads
    for (let y = centerY - (h/2 * 0.8) * borderScale; y <= centerY + (h/2 * 0.8) * borderScale; y += 25 * borderScale) {
        ctx.beginPath();
        ctx.moveTo(centerX - (w/2 * 0.85) * borderScale, y);
        ctx.lineTo(centerX + (w/2 * 0.85) * borderScale, y);
        ctx.stroke();
    }
    // Vertical roads
    for (let x = centerX - (w/2 * 0.85) * borderScale; x <= centerX + (w/2 * 0.85) * borderScale; x += 35 * borderScale) {
        ctx.beginPath();
        ctx.moveTo(x, centerY - (h/2 * 0.8) * borderScale);
        ctx.lineTo(x, centerY + (h/2 * 0.8) * borderScale);
        ctx.stroke();
    }

    // Draw high density corridor transit line (if compactness > 50%)
    if (compactness > 50) {
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
        ctx.lineWidth = 4 * borderScale;
        ctx.beginPath();
        ctx.moveTo(centerX - (w/2 * 0.75) * borderScale, centerY);
        ctx.lineTo(centerX + (w/2 * 0.75) * borderScale, centerY);
        ctx.stroke();
        
        // draw a small train or transit icon
        const trainX = centerX + Math.sin(Date.now() / 2000) * (w/2 * 0.65) * borderScale;
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(trainX - 10 * borderScale, centerY - 4 * borderScale, 20 * borderScale, 8 * borderScale);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(trainX + 4 * borderScale, centerY - 2 * borderScale, 4 * borderScale, 4 * borderScale);
    }

    // Draw buildings
    buildSpots.forEach((spot, i) => {
        // Calculate spot relative to center and scale
        const relX = spot.x - centerX;
        const relY = spot.y - centerY;
        
        const drawX = centerX + relX * borderScale + spot.offsetX * borderScale;
        const drawY = centerY + relY * borderScale + spot.offsetY * borderScale;

        // Clip drawing to bounds
        const boundLeft = centerX - (w / 2 * 0.85) * borderScale;
        const boundRight = centerX + (w / 2 * 0.85) * borderScale;
        const boundTop = centerY - (h / 2 * 0.8) * borderScale;
        const boundBottom = centerY + (h / 2 * 0.8) * borderScale;

        // Skip buildings that fell out of scaled bounds
        if (drawX < boundLeft || drawX > boundRight || drawY < boundTop || drawY > boundBottom) {
            return;
        }

        // Density effects: high density buildings appear in center as compactness grows
        const distFromCenter = Math.sqrt(relX * relX + relY * relY);
        const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
        const centerProximity = 1.0 - (distFromCenter / maxDist);
        
        // As density increases, center spots mutate into high-density buildings
        const isHighDensity = spot.type === 'high' || (compactness > 50 && centerProximity > (0.8 - compactness/400));
        
        if (isHighDensity) {
            // Draw high density block (Apartments)
            // Color shifts green (sustainable/transit-oriented)
            ctx.fillStyle = compactness > 100 ? 'rgba(16, 185, 129, 0.75)' : 'rgba(59, 130, 246, 0.65)';
            const blockW = (spot.size * 0.85) * borderScale;
            // Draw taller block
            const blockH = (spot.size * 1.6) * borderScale;
            ctx.fillRect(drawX - blockW / 2, drawY - blockH / 2, blockW, blockH);
            
            // Draw little window dots
            ctx.fillStyle = '#ffffff';
            const winSpacing = Math.max(2 * borderScale, 1.5);
            ctx.fillRect(drawX - blockW/4, drawY - blockH/4, 2 * borderScale, 2 * borderScale);
            ctx.fillRect(drawX + blockW/12, drawY - blockH/4, 2 * borderScale, 2 * borderScale);
            ctx.fillRect(drawX - blockW/4, drawY + blockH/12, 2 * borderScale, 2 * borderScale);
            ctx.fillRect(drawX + blockW/12, drawY + blockH/12, 2 * borderScale, 2 * borderScale);
        } else {
            // Draw low density house (sprawl)
            ctx.fillStyle = 'rgba(239, 68, 68, 0.55)';
            const size = spot.size * borderScale;
            
            ctx.beginPath();
            // roof triangle
            ctx.moveTo(drawX, drawY - size/2);
            ctx.lineTo(drawX - size/2, drawY);
            ctx.lineTo(drawX + size/2, drawY);
            ctx.closePath();
            ctx.fill();
            
            // wall square
            ctx.fillRect(drawX - size/2.5, drawY, size/1.25, size/2);
        }
    });

    // Draw and animate particles (traffic flow)
    particles.forEach(p => {
        // Particles move inside boundaries, or wrap around
        const boundLeft = centerX - (w / 2 * 0.85) * borderScale;
        const boundRight = centerX + (w / 2 * 0.85) * borderScale;
        const boundTop = centerY - (h / 2 * 0.8) * borderScale;
        const boundBottom = centerY + (h / 2 * 0.8) * borderScale;

        // Move particle
        if (p.dir === 'h') {
            p.x += p.speed * borderScale;
            if (p.x > boundRight) p.x = boundLeft;
            if (p.x < boundLeft) p.x = boundRight;
            // Keep vertical within bounds
            if (p.y < boundTop || p.y > boundBottom) {
                p.y = boundTop + Math.random() * (boundBottom - boundTop);
            }
        } else {
            p.y += p.speed * borderScale;
            if (p.y > boundBottom) p.y = boundTop;
            if (p.y < boundTop) p.y = boundBottom;
            // Keep horizontal within bounds
            if (p.x < boundLeft || p.x > boundRight) {
                p.x = boundLeft + Math.random() * (boundRight - boundLeft);
            }
        }

        // Color cars green depending on target EV share
        const randId = Math.random() * 100;
        const isEvCar = randId < targetEv;
        ctx.fillStyle = isEvCar ? '#10b981' : '#64748b';
        
        // Draw car
        const carSize = Math.max(3 * borderScale, 2);
        ctx.fillRect(p.x - carSize / 2, p.y - carSize / 2, carSize * 1.5, carSize);
    });
}

// Initial dataset fetch
loadData();
