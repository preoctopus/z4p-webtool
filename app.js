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

// Formula Table Elements
const calcBaseFe = document.getElementById("calc-base-fe");
const calcPropFe = document.getElementById("calc-prop-fe");
const calcBaseSizeDev = document.getElementById("calc-base-sizedev");
const calcPropSizeDev = document.getElementById("calc-prop-sizedev");
const calcBasePopTerm = document.getElementById("calc-base-popterm");
const calcPropPopTerm = document.getElementById("calc-prop-popterm");
const calcBaseDensTerm = document.getElementById("calc-base-densterm");
const calcPropDensTerm = document.getElementById("calc-prop-densterm");
const calcBaseLnVkt = document.getElementById("calc-base-lnvkt");
const calcPropLnVkt = document.getElementById("calc-prop-lnvkt");
const calcBaseVkt = document.getElementById("calc-base-vkt");
const calcPropVkt = document.getElementById("calc-prop-vkt");
const co2MathDetails = document.getElementById("co2-math-details");

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
        vktPerCapita,
        interceptDev,
        lnPop,
        lnDensity,
        predictedLnVkt,
        evShare
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

    // 4. Populate Live Formula Breakdowns
    calcBaseFe.textContent = baseline.countryFe.toFixed(4);
    calcPropFe.textContent = proposed.countryFe.toFixed(4);
    
    calcBaseSizeDev.textContent = baseline.interceptDev.toFixed(4);
    calcPropSizeDev.textContent = proposed.interceptDev.toFixed(4);
    
    calcBasePopTerm.innerHTML = `${baseline.slopePop.toFixed(4)} &times; ${baseline.lnPop.toFixed(4)} = <span class="text-white-muted">${(baseline.slopePop * baseline.lnPop).toFixed(4)}</span>`;
    calcPropPopTerm.innerHTML = `${proposed.slopePop.toFixed(4)} &times; ${proposed.lnPop.toFixed(4)} = <span class="text-white-muted">${(proposed.slopePop * proposed.lnPop).toFixed(4)}</span>`;
    
    calcBaseDensTerm.innerHTML = `${baseline.slopeDensity.toFixed(4)} &times; ${baseline.lnDensity.toFixed(4)} = <span class="text-white-muted">${(baseline.slopeDensity * baseline.lnDensity).toFixed(4)}</span>`;
    calcPropDensTerm.innerHTML = `${proposed.slopeDensity.toFixed(4)} &times; ${proposed.lnDensity.toFixed(4)} = <span class="text-white-muted">${(proposed.slopeDensity * proposed.lnDensity).toFixed(4)}</span>`;
    
    calcBaseLnVkt.textContent = baseline.predictedLnVkt.toFixed(4);
    calcPropLnVkt.textContent = proposed.predictedLnVkt.toFixed(4);
    
    calcBaseVkt.textContent = formatNumber(baseline.vkt, 1);
    calcPropVkt.textContent = formatNumber(proposed.vkt, 1);

    // Dynamic CO2 Math Details
    co2MathDetails.innerHTML = 
        `<strong>Baseline:</strong> ${formatNumber(baseline.vkt, 1)} &times; (1 - ${(baseline.evShare / 100).toFixed(2)}) &times; ${baseline.emissionIntensity.toFixed(1)} g/km &divide; 1M = <strong>${formatNumber(baseline.totalCO2e, 1)} tonnes</strong><br>` +
        `<strong>Proposed:</strong> ${formatNumber(proposed.vkt, 1)} &times; (1 - ${(proposed.evShare / 100).toFixed(2)}) &times; ${proposed.emissionIntensity.toFixed(1)} g/km &divide; 1M = <strong>${formatNumber(proposed.totalCO2e, 1)} tonnes</strong>`;
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
                    grid: { color: 'rgba(40, 95, 92, 0.08)' },
                    ticks: { color: '#5c7c7a', font: { size: 10 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#5c7c7a', font: { size: 10 } }
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
                backgroundColor: ['#285f5c', '#79cab7'],
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
                    color: '#1b3a38',
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
                backgroundColor: ['#8970b2', '#79cab7'],
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
                    color: '#1b3a38',
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

// Initial dataset fetch
loadData();
