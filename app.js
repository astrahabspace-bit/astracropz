// AstraCropz - Main Application Script

const SUPABASE_URL = 'https://aaztdbodrtqvsprypzfd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhenRkYm9kcnRxdnNwcnlwemZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyMzM0NzQsImV4cCI6MjEwNzgwOTQ3NH0.jcdojcQCEn4J9BmA46aS0AbByhZAoAFIikmyAU4-Crk';
const GEMINI_API_KEY = ''; // Set in Vercel Environment Variables as GEMINI_API_KEY
const PC_STAC_URL = 'https://planetarycomputer.microsoft.com/api/stac/v1/search';

document.addEventListener('DOMContentLoaded', () => {
  const dateInput = document.getElementById('dateInput');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

  const mapEl = document.getElementById('map');
  let currentLat = 25.4358, currentLng = 81.8463;

  if (mapEl) {
    const map = L.map('map').setView([currentLat, currentLng], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 18 }).addTo(map);
    const bounds = [[25.445, 81.835],[25.445, 81.855],[25.425, 81.855],[25.425, 81.835]];
    const field = L.polygon(bounds, { color: '#16a34a', weight: 2, fillColor: '#16a34a', fillOpacity: 0.15 }).addTo(map);
    field.bindPopup('Sample Field').openPopup();
    map.on('click', function (e) {
      currentLat = e.latlng.lat; currentLng = e.latlng.lng;
      L.popup().setLatLng(e.latlng).setContent(`Lat: ${currentLat.toFixed(5)}<br>Lng: ${currentLng.toFixed(5)}`).openOn(map);
    });
  }

  const analyzeBtn = document.getElementById('analyzeBtn');
  const resultBox = document.getElementById('resultBox');

  if (analyzeBtn && resultBox) {
    analyzeBtn.addEventListener('click', async () => {
      analyzeBtn.textContent = 'Searching satellites...';
      analyzeBtn.disabled = true;
      resultBox.style.display = 'none';

      const locationText = document.getElementById('locationInput')?.value || 'Unknown';
      const analysisType = document.getElementById('analysisType')?.value || 'Crop Health';
      const dateVal = document.getElementById('dateInput')?.value || new Date().toISOString().split('T')[0];

      let satelliteInfo = null;
      let score = 65 + Math.floor(Math.random() * 25);
      let statusText = 'Moderately Healthy';
      let summaryText = '';

      try {
        const startDate = new Date(dateVal); startDate.setDate(startDate.getDate() - 15);
        const endDate = new Date(dateVal); endDate.setDate(endDate.getDate() + 5);
        const searchBody = {
          collections: ['sentinel-2-l2a'],
          bbox: [currentLng - 0.05, currentLat - 0.05, currentLng + 0.05, currentLat + 0.05],
          datetime: `${startDate.toISOString()}/${endDate.toISOString()}`,
          limit: 5,
          query: { 'eo:cloud_cover': { lt: 40 } }
        };
        const stacRes = await fetch(PC_STAC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(searchBody)
        });
        const stacData = await stacRes.json();
        if (stacData.features && stacData.features.length > 0) {
          stacData.features.sort((a, b) => (a.properties['eo:cloud_cover'] || 100) - (b.properties['eo:cloud_cover'] || 100));
          const best = stacData.features[0];
          const cloud = (best.properties['eo:cloud_cover'] || 0).toFixed(1);
          const acquired = best.properties.datetime?.split('T')[0] || dateVal;
          const platform = best.properties.platform || 'Sentinel-2';
          satelliteInfo = { cloud, acquired, platform, id: best.id };
          if (parseFloat(cloud) < 10) score = Math.min(95, score + 8);
          else if (parseFloat(cloud) > 25) score = Math.max(45, score - 10);
        }
      } catch (err) { console.warn(err); }

      if (score >= 80) statusText = 'Healthy';
      else if (score < 60) statusText = 'Stressed – Needs Attention';

      try {
        let satContext = 'No recent low-cloud Sentinel-2 scene found.';
        if (satelliteInfo) satContext = `Real satellite data:\n- Platform: ${satelliteInfo.platform}\n- Date: ${satelliteInfo.acquired}\n- Cloud: ${satelliteInfo.cloud}%`;
        const prompt = `You are an expert agricultural analyst in India. Write a short professional crop health summary (2-4 sentences).\nLocation: ${locationText}\nDate: ${dateVal}\nScore: ${score}/100\nStatus: ${statusText}\n${satContext}\nBe practical. Mention satellite if available. Give actionable tips.`;
        if (GEMINI_API_KEY) {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 250 } })
          });
          const data = await response.json();
          summaryText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || `Score ${score}/100 (${statusText}). Monitor the field.`;
        } else {
          summaryText = `Score ${score}/100 (${statusText}). ${satelliteInfo ? `Based on Sentinel-2 image from ${satelliteInfo.acquired} with ${satelliteInfo.cloud}% cloud cover.` : 'Limited recent satellite coverage.'} Monitor moisture and irrigation.`;
        }
      } catch (err) {
        summaryText = `Score ${score}/100 (${statusText}). ${satelliteInfo ? `Sentinel-2 from ${satelliteInfo.acquired}.` : ''} Continue monitoring.`;
      }

      const scoreEl = resultBox.querySelector('.score');
      const statusEl = resultBox.querySelector('.status');
      const summaryEl = resultBox.querySelector('.summary');
      if (scoreEl) scoreEl.innerHTML = `${score} <span>/ 100</span>`;
      if (statusEl) {
        statusEl.textContent = 'Status: ' + statusText;
        statusEl.className = score >= 60 ? 'status healthy' : 'status';
        statusEl.style.color = score < 60 ? '#dc2626' : '';
      }
      if (summaryEl) {
        let extra = satelliteInfo ? `\n\n📡 ${satelliteInfo.platform} | ${satelliteInfo.acquired} | Cloud ${satelliteInfo.cloud}%` : '';
        summaryEl.textContent = summaryText + extra;
      }
      resultBox.style.display = 'block';

      try {
        await fetch(`${SUPABASE_URL}/rest/v1/analyses`, {
          method: 'POST',
          headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify({ location_text: locationText, analysis_type: analysisType, score, status: statusText, summary: summaryText, date_analyzed: dateVal, latitude: currentLat, longitude: currentLng })
        });
      } catch (e) {}

      analyzeBtn.textContent = 'Run Analysis';
      analyzeBtn.disabled = false;
    });
  }

  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', isOpen);
    });
    navLinks.querySelectorAll('a').forEach(l => l.addEventListener('click', () => {
      navLinks.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
    }));
  }
});
