// Toyota Car Data - akan dimuat dari toyota.json
let toyotaData = null;

// Interest rates berdasarkan tenor (dalam persen per tahun)
const interestRates = {
    12: 6.5,   // 1 tahun
    24: 7.0,   // 2 tahun
    36: 7.5,   // 3 tahun
    48: 8.0,   // 4 tahun
    60: 8.5    // 5 tahun
};

// Load Toyota data saat halaman dimuat
document.addEventListener('DOMContentLoaded', async function() {
    await loadToyotaData();
    setupEventListeners();
});

// Load data Toyota dari file JSON
async function loadToyotaData() {
    try {
        const response = await fetch('toyota.json');
        toyotaData = await response.json();
        console.log('Toyota data loaded:', toyotaData);
    } catch (error) {
        console.error('Error loading Toyota data:', error);
        showAlert('Gagal memuat data mobil Toyota. Silakan refresh halaman.', 'warning');
    }
}

// Setup event listeners
function setupEventListeners() {
    const form = document.getElementById('carRecommendationForm');
    form.addEventListener('submit', handleFormSubmit);
    
    // Setup modal close
    const modal = document.getElementById('carModal');
    const closeBtn = modal.querySelector('.close');
    
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Format input angka
    setupNumberFormatting();
    
    // Setup search and filter (akan aktif setelah ada hasil)
    setupSearchAndFilter();
}

// Setup number formatting untuk input
function setupNumberFormatting() {
    const numberInputs = ['budget', 'income', 'expenses'];
    
    numberInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        
        // Simpan posisi cursor
        let selectionStart = 0;
        let selectionEnd = 0;
        
        input.addEventListener('input', function(e) {
            // Simpan posisi cursor sebelum format
            selectionStart = e.target.selectionStart;
            selectionEnd = e.target.selectionEnd;
            
            // Hapus semua karakter non-digit
            let value = e.target.value.replace(/\D/g, '');
            
            // Jika ada value, format dengan pemisah ribuan
            if (value) {
                const oldLength = e.target.value.length;
                const formatted = parseInt(value).toLocaleString('id-ID');
                e.target.value = formatted;
                
                // Hitung posisi cursor baru berdasarkan perubahan panjang
                const lengthDiff = formatted.length - oldLength;
                const newPosition = selectionStart + lengthDiff;
                
                // Set cursor position setelah format (dengan delay untuk memastikan value sudah ter-update)
                setTimeout(() => {
                    e.target.setSelectionRange(newPosition, newPosition);
                }, 0);
            }
        });
        
        // Event untuk memastikan hanya angka yang bisa diketik
        input.addEventListener('keypress', function(e) {
            // Izinkan: backspace, delete, tab, escape, enter
            if ([8, 9, 27, 13, 46].indexOf(e.keyCode) !== -1 ||
                // Izinkan: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
                (e.keyCode === 65 && e.ctrlKey === true) ||
                (e.keyCode === 67 && e.ctrlKey === true) ||
                (e.keyCode === 86 && e.ctrlKey === true) ||
                (e.keyCode === 88 && e.ctrlKey === true)) {
                return;
            }
            // Pastikan hanya angka (0-9)
            if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
                e.preventDefault();
            }
        });
        
        // Event untuk paste - pastikan hanya angka
        input.addEventListener('paste', function(e) {
            e.preventDefault();
            let paste = (e.clipboardData || window.clipboardData).getData('text');
            // Hapus semua non-digit dari paste
            paste = paste.replace(/\D/g, '');
            if (paste) {
                e.target.value = parseInt(paste).toLocaleString('id-ID');
            }
        });
        
        // Format placeholder saat focus
        input.addEventListener('focus', function(e) {
            if (e.target.placeholder) {
                const numValue = e.target.placeholder.replace(/\D/g, '');
                if (numValue) {
                    e.target.placeholder = parseInt(numValue).toLocaleString('id-ID');
                }
            }
        });
    });
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    if (!toyotaData) {
        showAlert('Data mobil belum dimuat. Silakan tunggu sebentar dan coba lagi.', 'warning');
        return;
    }
    
    // Ambil data dari form
    const formData = getFormData();
    
    // Validasi input
    if (!validateFormData(formData)) {
        return;
    }
    
    // Hitung kemampuan finansial
    const financialCapacity = calculateFinancialCapacity(formData);
    
    // Cari mobil yang sesuai
    const recommendations = findRecommendations(formData, financialCapacity);
    
    // Tampilkan hasil
    displayResults(formData, financialCapacity, recommendations);
}

// Ambil data dari form
function getFormData() {
    return {
        budget: parseNumberInput(document.getElementById('budget').value),
        income: parseNumberInput(document.getElementById('income').value),
        expenses: parseNumberInput(document.getElementById('expenses').value),
        downPayment: parseInt(document.getElementById('downPayment').value),
        tenure: parseInt(document.getElementById('tenure').value)
    };
}

// Parse input angka yang sudah diformat
function parseNumberInput(value) {
    if (!value) return 0;
    // Hapus semua karakter non-digit dan parse ke integer
    const cleanValue = value.toString().replace(/\D/g, '');
    return parseInt(cleanValue) || 0;
}

// Validasi data form
function validateFormData(data) {
    // Cek apakah semua field terisi
    if (data.budget <= 0) {
        showAlert('Budget harus diisi dan lebih besar dari 0.', 'warning');
        return false;
    }
    
    if (data.income <= 0) {
        showAlert('Penghasilan per bulan harus diisi dan lebih besar dari 0.', 'warning');
        return false;
    }
    
    if (data.expenses < 0) {
        showAlert('Pengeluaran per bulan tidak boleh negatif.', 'warning');
        return false;
    }
    
    if (data.income <= data.expenses) {
        showAlert('Penghasilan harus lebih besar dari pengeluaran bulanan.', 'warning');
        return false;
    }
    
    if (!data.downPayment || data.downPayment <= 0) {
        showAlert('Silakan pilih persentase uang muka.', 'warning');
        return false;
    }
    
    if (!data.tenure || data.tenure <= 0) {
        showAlert('Silakan pilih tenor cicilan.', 'warning');
        return false;
    }
    
    const availableIncome = data.income - data.expenses;
    const maxInstallment = availableIncome * 0.3; // Maksimal 30% dari sisa penghasilan
    
    if (maxInstallment < 500000) {
        showAlert(`Sisa penghasilan Anda (${formatCurrency(availableIncome)}) terlalu kecil untuk cicilan mobil. Minimal diperlukan sisa penghasilan ${formatCurrency(1667000)} untuk cicilan minimum ${formatCurrency(500000)}/bulan.`, 'warning');
        return false;
    }
    
    return true;
}

// Hitung kemampuan finansial
function calculateFinancialCapacity(data) {
    const availableIncome = data.income - data.expenses;
    const maxInstallment = availableIncome * 0.3; // Maksimal 30% dari sisa penghasilan
    const downPaymentAmount = data.budget * (data.downPayment / 100);
    const loanAmount = data.budget - downPaymentAmount;
    const interestRate = interestRates[data.tenure] / 100 / 12; // Rate bulanan
    
    // Hitung cicilan berdasarkan budget
    const budgetInstallment = calculateInstallment(loanAmount, interestRate, data.tenure);
    
    return {
        availableIncome,
        maxInstallment,
        downPaymentAmount,
        loanAmount,
        budgetInstallment,
        interestRate: interestRates[data.tenure]
    };
}

// Hitung cicilan bulanan
function calculateInstallment(principal, monthlyRate, months) {
    if (monthlyRate === 0) return principal / months;
    
    const factor = Math.pow(1 + monthlyRate, months);
    return (principal * monthlyRate * factor) / (factor - 1);
}

// Cari rekomendasi mobil
function findRecommendations(formData, capacity) {
    const recommendations = [];
    
    Object.values(toyotaData.model_series).forEach(series => {
        series.models.forEach(model => {
            // Skip model tanpa harga
            if (!model.price || model.price <= 0) return;
            
            // Cek apakah harga dalam budget
            if (model.price <= formData.budget) {
                const downPaymentAmount = model.price * (formData.downPayment / 100);
                const loanAmount = model.price - downPaymentAmount;
                const monthlyRate = interestRates[formData.tenure] / 100 / 12;
                const installment = calculateInstallment(loanAmount, monthlyRate, formData.tenure);
                
                // Cek apakah cicilan dalam kemampuan
                if (installment <= capacity.maxInstallment) {
                    const recommendation = {
                        series: series.series_name,
                        model: model.model_name,
                        price: model.price,
                        priceFormatted: model.price_formatted,
                        images: series.image_urls || [],
                        downPayment: downPaymentAmount,
                        loanAmount: loanAmount,
                        installment: installment,
                        totalPayment: (installment * formData.tenure) + downPaymentAmount,
                        interestTotal: (installment * formData.tenure) - loanAmount,
                        affordabilityRatio: installment / capacity.maxInstallment,
                        tenure: formData.tenure,
                        interestRate: interestRates[formData.tenure]
                    };
                    
                    recommendations.push(recommendation);
                }
            }
        });
    });
    
    // Urutkan berdasarkan affordability ratio (yang paling terjangkau dulu)
    recommendations.sort((a, b) => a.affordabilityRatio - b.affordabilityRatio);
    
    return recommendations;
}

// Tampilkan hasil rekomendasi
function displayResults(formData, capacity, recommendations) {
    const resultsSection = document.getElementById('resultsSection');
    const financialSummary = document.getElementById('financialSummary');
    
    // Store recommendations globally untuk search dan filter
    allRecommendations = recommendations;
    filteredRecommendations = [...recommendations];
    currentSearchTerm = '';
    currentFilter = 'all';
    
    // Tampilkan ringkasan finansial
    financialSummary.innerHTML = createFinancialSummary(formData, capacity);
    
    // Initialize search dan filter
    updateFilterCounts();
    updateResultsDisplay();
    updateResetButton();
    
    // Reset filter tabs
    const filterTabs = document.querySelectorAll('.filter-tab');
    filterTabs.forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.filter === 'all') {
            tab.classList.add('active');
        }
    });
    
    // Reset search input
    const searchInput = document.getElementById('carSearch');
    const clearBtn = document.getElementById('clearSearch');
    if (searchInput) {
        searchInput.value = '';
        clearBtn.style.display = 'none';
    }
    
    // Tampilkan section results
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth' });
    resultsSection.classList.add('fade-in');
}

// Buat ringkasan finansial
function createFinancialSummary(formData, capacity) {
    return `
        <h3><i class="fas fa-chart-line"></i> Ringkasan Kemampuan Finansial Anda</h3>
        <div class="summary-grid">
            <div class="summary-item">
                <h4>Budget Maksimal</h4>
                <div class="value">${formatCurrency(formData.budget)}</div>
            </div>
            <div class="summary-item">
                <h4>Sisa Penghasilan</h4>
                <div class="value">${formatCurrency(capacity.availableIncome)}</div>
            </div>
            <div class="summary-item">
                <h4>Cicilan Maksimal</h4>
                <div class="value">${formatCurrency(capacity.maxInstallment)}</div>
            </div>
            <div class="summary-item">
                <h4>Uang Muka</h4>
                <div class="value">${formData.downPayment}%</div>
            </div>
            <div class="summary-item">
                <h4>Tenor</h4>
                <div class="value">${formData.tenure} bulan</div>
            </div>
            <div class="summary-item">
                <h4>Suku Bunga</h4>
                <div class="value">${capacity.interestRate}% p.a</div>
            </div>
        </div>
    `;
}

// Buat card mobil
function createCarCard(car, index) {
    const isRecommended = index < 3; // 3 mobil pertama sebagai rekomendasi
    const mainImage = car.images && car.images.length > 0 ? car.images[0] : 'https://via.placeholder.com/300x200?text=No+Image';
    
    return `
        <div class="car-card slide-up">
            <div class="car-header">
                <img src="${mainImage}" alt="${car.model}" class="car-image" 
                     onerror="this.src='https://via.placeholder.com/300x200?text=Toyota+${car.series}'">
                ${isRecommended ? '<div class="recommended-badge"><i class="fas fa-star"></i> Rekomendasi</div>' : ''}
            </div>
            <div class="car-content">
                <h3 class="car-title">${car.model}</h3>
                <div class="car-price">${car.priceFormatted}</div>
                
                <div class="installment-info">
                    <div class="installment-row">
                        <span class="installment-label">Uang Muka:</span>
                        <span class="installment-value">${formatCurrency(car.downPayment)}</span>
                    </div>
                    <div class="installment-row">
                        <span class="installment-label">Cicilan/bulan:</span>
                        <span class="installment-value monthly-payment">${formatCurrency(car.installment)}</span>
                    </div>
                    <div class="installment-row">
                        <span class="installment-label">Total Bayar:</span>
                        <span class="installment-value">${formatCurrency(car.totalPayment)}</span>
                    </div>
                </div>
                
                <div class="car-features">
                    <span class="feature-tag">${car.tenure} bulan</span>
                    <span class="feature-tag">${car.interestRate}% p.a</span>
                    <span class="feature-tag">${(car.affordabilityRatio * 100).toFixed(0)}% kemampuan</span>
                </div>
                
                <button class="detail-btn" data-car-index="${index}">
                    <i class="fas fa-eye"></i> Lihat Detail & Simulasi
                </button>
            </div>
        </div>
    `;
}

// Tampilkan detail mobil dalam modal
function showCarDetail(car) {
    const modal = document.getElementById('carModal');
    const modalContent = document.getElementById('modalContent');
    
    modalContent.innerHTML = createCarDetailModal(car);
    modal.style.display = 'block';
    
    // Setup carousel jika ada multiple images
    if (car.images && car.images.length > 1) {
        setupCarousel(car.images);
    }
}

// Buat konten modal detail mobil
function createCarDetailModal(car) {
    const hasMultipleImages = car.images && car.images.length > 1;
    
    return `
        <h2><i class="fas fa-car"></i> ${car.model}</h2>
        
        ${car.images && car.images.length > 0 ? `
            <div class="image-carousel">
                <div class="carousel-container" id="carouselContainer">
                    ${car.images.map(img => 
                        `<img src="${img}" alt="${car.model}" class="carousel-image" 
                              onerror="this.src='https://via.placeholder.com/400x300?text=Toyota+${car.series}'">`
                    ).join('')}
                </div>
                ${hasMultipleImages ? `
                    <button class="carousel-btn prev" onclick="previousImage()">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <button class="carousel-btn next" onclick="nextImage()">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                ` : ''}
            </div>
            ${hasMultipleImages ? `
                <div class="carousel-indicators" id="carouselIndicators">
                    ${car.images.map((_, index) => 
                        `<div class="indicator ${index === 0 ? 'active' : ''}" onclick="goToImage(${index})"></div>`
                    ).join('')}
                </div>
            ` : ''}
        ` : ''}
        
        <h3><i class="fas fa-calculator"></i> Detail Simulasi Cicilan</h3>
        <table class="detail-table">
            <tr>
                <th>Harga Mobil</th>
                <td>${car.priceFormatted}</td>
            </tr>
            <tr>
                <th>Uang Muka</th>
                <td>${formatCurrency(car.downPayment)}</td>
            </tr>
            <tr>
                <th>Jumlah Pinjaman</th>
                <td>${formatCurrency(car.loanAmount)}</td>
            </tr>
            <tr>
                <th>Tenor</th>
                <td>${car.tenure} bulan</td>
            </tr>
            <tr>
                <th>Suku Bunga</th>
                <td>${car.interestRate}% per tahun</td>
            </tr>
            <tr>
                <th>Cicilan per Bulan</th>
                <td><strong style="color: #e60012;">${formatCurrency(car.installment)}</strong></td>
            </tr>
            <tr>
                <th>Total Bunga</th>
                <td>${formatCurrency(car.interestTotal)}</td>
            </tr>
            <tr>
                <th>Total Pembayaran</th>
                <td><strong>${formatCurrency(car.totalPayment)}</strong></td>
            </tr>
        </table>
        
        <div class="alert alert-info" style="margin-top: 20px;">
            <h4><i class="fas fa-info-circle"></i> Catatan Penting</h4>
            <ul>
                <li>Simulasi ini hanya untuk perhitungan estimasi</li>
                <li>Suku bunga dan syarat kredit dapat berbeda di setiap dealer</li>
                <li>Hubungi dealer Toyota terdekat untuk informasi lebih detail</li>
                <li>Diperlukan dokumen lengkap untuk pengajuan kredit</li>
            </ul>
        </div>
    `;
}

// Carousel functionality
let currentImageIndex = 0;
let totalImages = 0;

function setupCarousel(images) {
    currentImageIndex = 0;
    totalImages = images.length;
}

function nextImage() {
    currentImageIndex = (currentImageIndex + 1) % totalImages;
    updateCarousel();
}

function previousImage() {
    currentImageIndex = (currentImageIndex - 1 + totalImages) % totalImages;
    updateCarousel();
}

function goToImage(index) {
    currentImageIndex = index;
    updateCarousel();
}

function updateCarousel() {
    const container = document.getElementById('carouselContainer');
    const indicators = document.querySelectorAll('.indicator');
    
    if (container) {
        container.style.transform = `translateX(-${currentImageIndex * 100}%)`;
    }
    
    indicators.forEach((indicator, index) => {
        indicator.classList.toggle('active', index === currentImageIndex);
    });
}

// Global variables untuk search dan filter
let allRecommendations = [];
let filteredRecommendations = [];
let currentSearchTerm = '';
let currentFilter = 'all';

// Setup search dan filter event listeners
function setupSearchAndFilter() {
    const searchInput = document.getElementById('carSearch');
    const clearSearchBtn = document.getElementById('clearSearch');
    const filterTabs = document.querySelectorAll('.filter-tab');
    const resetFiltersBtn = document.getElementById('resetFilters');
    
    // Search functionality
    searchInput.addEventListener('input', handleSearch);
    clearSearchBtn.addEventListener('click', clearSearch);
    
    // Filter functionality
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => handleFilterClick(tab));
    });
    
    resetFiltersBtn.addEventListener('click', resetFilters);
}

// Handle search input
function handleSearch(e) {
    currentSearchTerm = e.target.value.toLowerCase().trim();
    const clearBtn = document.getElementById('clearSearch');
    
    // Show/hide clear button
    if (currentSearchTerm) {
        clearBtn.style.display = 'flex';
    } else {
        clearBtn.style.display = 'none';
    }
    
    applyFilters();
}

// Clear search
function clearSearch() {
    const searchInput = document.getElementById('carSearch');
    const clearBtn = document.getElementById('clearSearch');
    
    searchInput.value = '';
    currentSearchTerm = '';
    clearBtn.style.display = 'none';
    
    applyFilters();
}

// Handle filter tab click
function handleFilterClick(clickedTab) {
    const filterTabs = document.querySelectorAll('.filter-tab');
    
    // Remove active class from all tabs
    filterTabs.forEach(tab => tab.classList.remove('active'));
    
    // Add active class to clicked tab
    clickedTab.classList.add('active');
    
    // Update current filter
    currentFilter = clickedTab.dataset.filter;
    
    applyFilters();
}

// Apply search and filter
function applyFilters() {
    let filtered = [...allRecommendations];
    
    // Apply search filter
    if (currentSearchTerm) {
        filtered = filtered.filter(car => {
            return (
                car.model.toLowerCase().includes(currentSearchTerm) ||
                car.series.toLowerCase().includes(currentSearchTerm)
            );
        });
    }
    
    // Apply price range filter
    if (currentFilter !== 'all') {
        filtered = filtered.filter(car => {
            const priceInJuta = car.price / 1000000;
            
            switch (currentFilter) {
                case '100-200':
                    return priceInJuta >= 100 && priceInJuta < 200;
                case '200-300':
                    return priceInJuta >= 200 && priceInJuta < 300;
                case '300-500':
                    return priceInJuta >= 300 && priceInJuta < 500;
                case '500-1000':
                    return priceInJuta >= 500 && priceInJuta < 1000;
                case '1000+':
                    return priceInJuta >= 1000;
                default:
                    return true;
            }
        });
    }
    
    filteredRecommendations = filtered;
    
    // Update display
    updateResultsDisplay();
    updateFilterCounts();
    updateResetButton();
}

// Update results display
function updateResultsDisplay() {
    const carsGrid = document.getElementById('carsGrid');
    const resultCount = document.getElementById('resultCount');
    
    resultCount.textContent = filteredRecommendations.length;
    
    if (filteredRecommendations.length === 0) {
        carsGrid.innerHTML = createNoResultsMessage();
    } else {
        carsGrid.innerHTML = filteredRecommendations.map((car, index) => createCarCard(car, index)).join('');
        
        // Setup event listeners untuk detail buttons
        filteredRecommendations.forEach((car, index) => {
            const detailBtn = document.querySelector(`[data-car-index="${index}"]`);
            if (detailBtn) {
                detailBtn.addEventListener('click', () => showCarDetail(car));
            }
        });
        
        // Add animation to cards
        setTimeout(() => {
            const cards = document.querySelectorAll('.car-card');
            cards.forEach((card, index) => {
                setTimeout(() => {
                    card.classList.add('fade-in');
                }, index * 100);
            });
        }, 50);
    }
}

// Create no results message
function createNoResultsMessage() {
    let message = '';
    let suggestions = [];
    
    if (currentSearchTerm && currentFilter !== 'all') {
        message = `Tidak ditemukan mobil dengan kata kunci "<strong>${currentSearchTerm}</strong>" dalam range harga yang dipilih.`;
        suggestions = [
            'Coba kata kunci lain',
            'Pilih range harga yang berbeda',
            'Hapus filter untuk melihat semua hasil'
        ];
    } else if (currentSearchTerm) {
        message = `Tidak ditemukan mobil dengan kata kunci "<strong>${currentSearchTerm}</strong>".`;
        suggestions = [
            'Periksa ejaan kata kunci',
            'Coba kata kunci yang lebih umum',
            'Gunakan nama seri mobil (contoh: Avanza, Innova)'
        ];
    } else if (currentFilter !== 'all') {
        message = 'Tidak ada mobil dalam range harga yang dipilih.';
        suggestions = [
            'Pilih range harga yang berbeda',
            'Lihat semua mobil dengan mengklik "Semua Mobil"'
        ];
    } else {
        message = 'Tidak ada hasil yang ditemukan.';
        suggestions = ['Reset semua filter dan coba lagi'];
    }
    
    return `
        <div class="no-results">
            <div class="no-results-icon">
                <i class="fas fa-search"></i>
            </div>
            <h3>Hasil Tidak Ditemukan</h3>
            <p>${message}</p>
            <div style="margin-top: 20px;">
                <strong>Saran:</strong>
                <ul style="text-align: left; display: inline-block; margin-top: 10px;">
                    ${suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;
}

// Update filter counts
function updateFilterCounts() {
    const counts = {
        all: allRecommendations.length,
        '100-200': 0,
        '200-300': 0,
        '300-500': 0,
        '500-1000': 0,
        '1000+': 0
    };
    
    allRecommendations.forEach(car => {
        const priceInJuta = car.price / 1000000;
        
        if (priceInJuta >= 100 && priceInJuta < 200) counts['100-200']++;
        else if (priceInJuta >= 200 && priceInJuta < 300) counts['200-300']++;
        else if (priceInJuta >= 300 && priceInJuta < 500) counts['300-500']++;
        else if (priceInJuta >= 500 && priceInJuta < 1000) counts['500-1000']++;
        else if (priceInJuta >= 1000) counts['1000+']++;
    });
    
    // Update count displays
    Object.keys(counts).forEach(filter => {
        const countElement = document.getElementById(`count${filter === 'all' ? 'All' : filter}`);
        if (countElement) {
            countElement.textContent = counts[filter];
        }
    });
}

// Update reset button visibility
function updateResetButton() {
    const resetBtn = document.getElementById('resetFilters');
    const hasActiveFilters = currentSearchTerm || currentFilter !== 'all';
    
    if (hasActiveFilters) {
        resetBtn.style.display = 'flex';
    } else {
        resetBtn.style.display = 'none';
    }
}

// Reset all filters
function resetFilters() {
    currentSearchTerm = '';
    currentFilter = 'all';
    
    // Reset search input
    const searchInput = document.getElementById('carSearch');
    const clearBtn = document.getElementById('clearSearch');
    searchInput.value = '';
    clearBtn.style.display = 'none';
    
    // Reset filter tabs
    const filterTabs = document.querySelectorAll('.filter-tab');
    filterTabs.forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.filter === 'all') {
            tab.classList.add('active');
        }
    });
    
    applyFilters();
}

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <i class="fas fa-${type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        ${message}
    `;
    
    // Insert at the top of main content
    const mainContent = document.querySelector('.main-content');
    mainContent.insertBefore(alertDiv, mainContent.firstChild);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
    }, 5000);
    
    // Scroll to alert
    alertDiv.scrollIntoView({ behavior: 'smooth' });
}
