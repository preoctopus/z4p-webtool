# CUFET • Compact Urban Form Estimation Tool

An interactive, premium-designed web application to explore the data and models from the research paper: **"A Simple Tool to Estimate Transport GHGs Mitigated from Compact Urban Form"** (*MDPI Applied Sciences, 2026*). 

The tool implements a Weighted Least Squares (WLS) regression model using boundaries from the Global Human Settlement Layer (GHSL) and emissions activity from the Climate TRACE dataset. It serves as a visual decision-support dashboard demonstrating the carbon mitigation benefits of compact urban form (rezoning) and fleet electrification.

---

## 🔍 How it Works

CUFET uses a non-linear regression model to predict a city's annual **Vehicle Kilometers Traveled (VKT)** based on its **Population** and **Population Density**, incorporating a **Country Fixed Effect ($\delta_k$)** to capture country-level structural variations.

### 1. Model Equation
$$\ln(\text{VKT}_i) = \beta_0 + \delta_k + d_I + \beta_1 \ln(\text{Population}_i) + \beta_2 \ln(\text{Density}_i)$$

Where:
*   $\beta_0$ = Global Intercept (`7.594772`)
*   $\delta_k$ = Country Fixed Effect coefficient (e.g., `2.7168` for the USA, `2.4528` for Canada, `-1.1759` for Bangladesh)
*   $d_I$ = Size band intercept deviation
*   $\beta_1$ = Population elasticity
*   $\beta_2$ = Density elasticity

### 2. Size Bands & Coefficients
The model classifies cities into three population categories:

| Size Category | Population Threshold | Intercept Dev ($d_I$) | Pop Elasticity ($\beta_1$) | Density Elasticity ($\beta_2$) |
| :--- | :--- | :--- | :--- | :--- |
| **Small** | $< 88,335.2$ | `-3.163533` | `1.583034` | `-0.605285` |
| **Medium** | $88,335.2 \text{ to } 329,479.8$ | `-0.529571` | `1.282541` | `-0.512437` |
| **Large** | $\ge 329,479.8$ | `0.000000` | `1.035974` | `-0.206500` |

> **Non-Linear Insights**: Density increases have a far higher relative impact in reducing driving in Small and Medium-sized settlements (elasticities of `-0.61` and `-0.51` respectively) than in Large cities (elasticity of `-0.21`).

### 3. VKT to Carbon Emissions
Emissions are calculated from Predicted VKT by factoring in the Electric Vehicle (EV) fleet share and local Emission Intensity (EI) values:
$$\text{CO}_2\text{e Emissions (tonnes)} = \text{VKT} \times \left(1 - \frac{\% \text{EV}}{100}\right) \times \frac{\text{EI}}{1,000,000}$$

Where **EI** (in $g\text{ CO}_2e/km$) is loaded dynamically:
1.  **City-level specific EI** (9,850 custom city records included in the dataset).
2.  Falls back to **Country-level default EI** (if city record is absent).
3.  Falls back to **Global average default** (`226.2 g/km`) as a final fallback.

---

## 🛠️ Local Development

You can serve the static site locally using python's built-in HTTP server:

```bash
# Navigate to the workspace directory
cd /Users/atarzwell/src/z4p-webtool

# Run server
python3 -m http.server 8080
```
Open **[http://localhost:8080](http://localhost:8080)** in your browser.

---

## 🐳 Build & Run with Local Docker

You can package and test the site locally inside an isolated Docker container powered by Nginx:

### 1. Build the Docker Image
```bash
docker build -t cufet-webtool .
```

### 2. Run the Container
Run the container in the background, mapping Nginx's port `8080` inside the container to port `8080` on your localhost:
```bash
docker run -d -p 8080:8080 --name cufet-app cufet-webtool
```

### 3. Verification
*   Open **[http://localhost:8080](http://localhost:8080)** to test the dashboard.
*   To check container logs: `docker logs cufet-app`
*   To stop the container: `docker stop cufet-app`
*   To delete the container: `docker rm cufet-app`

---

## ☁️ Google Cloud Run Deployment

We utilize Cloud Build to compile and deploy the container to Google Cloud Run in a single step using the source deploy function.

### Interactive Script Deployment
An automated bash assistant script is provided to guide you through authentication, project selection, service configuration, and deployment:

```bash
# 1. Make the script executable
chmod +x deploy_gcp.sh

# 2. Execute the script
./deploy_gcp.sh
```

### Manual CLI Deployment
If you prefer running commands manually in your terminal, execute:
```bash
gcloud run deploy cufet-webtool \
    --source . \
    --region us-central1 \
    --allow-unauthenticated \
    --port 8080
```
Upon completion, the CLI will output the active public Cloud Run URL.
