// Initialize variables
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const imageGrid = document.getElementById('imageGrid');
const convertBtn = document.getElementById('convertBtn');
const newPdfBtn = document.getElementById('newPdfBtn');
const clearAllBtn = document.getElementById('clearAll');
const imageCountSpan = document.querySelector('.image-count');
let selectedFiles = [];
let generatedPDF = null;

// Show notification function
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icon = document.createElement('i');
    icon.className = type === 'success' 
        ? 'fas fa-check-circle'
        : 'fas fa-exclamation-circle';
    
    notification.appendChild(icon);
    notification.appendChild(document.createTextNode(message));
    
    const container = document.getElementById('notification-container');
    container.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Create or update download button
function updateDownloadButton(pdfBlob = null) {
    let downloadBtn = document.querySelector('.download-btn');
    
    if (!downloadBtn && pdfBlob) {
        downloadBtn = document.createElement('button');
        downloadBtn.className = 'download-btn';
        document.querySelector('.controls').appendChild(downloadBtn);
    }

    if (downloadBtn) {
        if (pdfBlob) {
            downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download PDF';
            downloadBtn.classList.add('ready');
            const url = URL.createObjectURL(pdfBlob);
            
            downloadBtn.onclick = () => {
                const link = document.createElement('a');
                link.href = url;
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                link.download = `converted_images_${timestamp}.pdf`;
                link.click();
                showNotification('PDF download started');
            };
        } else {
            downloadBtn.remove();
        }
    }
}

// Add drag and drop event listeners
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    
    if (files.length === 0) {
        showNotification('Please drop only image files (JPG, PNG, GIF)', 'error');
        return;
    }
    
    handleFiles(files);
});

// Handle file input change
fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    // Check file sizes
    const maxSize = 20 * 1024 * 1024; // 20MB
    const oversizedFiles = files.filter(file => file.size > maxSize);
    
    if (oversizedFiles.length > 0) {
        showNotification('Some files exceed the 20MB size limit', 'error');
        return;
    }
    
    handleFiles(files);
});

// Handle selected files
function handleFiles(files) {
    const promises = [];
    updateDownloadButton(null); // Remove download button when adding new files
    
    files.forEach(file => {
        if (file.type.startsWith('image/')) {
            const promise = new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    resolve({
                        file: file,
                        data: e.target.result
                    });
                };
                reader.readAsDataURL(file);
            });
            promises.push(promise);
        }
    });

    Promise.all(promises).then(results => {
        results.forEach(result => {
            selectedFiles.push(result);
            displayImage(result.data, selectedFiles.length - 1);
        });
        updateUI();
        showNotification(`${results.length} image${results.length > 1 ? 's' : ''} added successfully`);
    });
}

// Display image preview
function displayImage(imageData, index) {
    const imageItem = document.createElement('div');
    imageItem.className = 'image-item';
    imageItem.innerHTML = `
        <img src="${imageData}" alt="Selected image">
        <button class="delete-btn" onclick="deleteImage(${index})" title="Remove image">
            <i class="fas fa-times"></i>
        </button>
    `;
    imageGrid.appendChild(imageItem);
}

// Delete image
function deleteImage(index) {
    selectedFiles.splice(index, 1);
    updateImageGrid();
    updateUI();
    updateDownloadButton(null); // Remove download button when modifying images
    showNotification('Image removed');
}

// Update image grid
function updateImageGrid() {
    imageGrid.innerHTML = '';
    selectedFiles.forEach((file, index) => {
        displayImage(file.data, index);
    });
}

// Update UI elements
function updateUI() {
    const count = selectedFiles.length;
    convertBtn.disabled = count === 0;
    clearAllBtn.disabled = count === 0;
    imageCountSpan.textContent = `${count} image${count !== 1 ? 's' : ''} selected`;
}

// Clear all images
clearAllBtn.addEventListener('click', () => {
    selectedFiles = [];
    updateImageGrid();
    updateUI();
    updateDownloadButton(null); // Remove download button when clearing
    showNotification('All images cleared');
});

// Modal functions
function showModal() {
    const modal = document.getElementById('customModal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
}

function hideModal() {
    const modal = document.getElementById('customModal');
    modal.classList.remove('show');
    setTimeout(() => modal.style.display = 'none', 300);
}

// Modal event listeners
document.getElementById('modalCancelBtn').addEventListener('click', hideModal);
document.getElementById('modalConfirmBtn').addEventListener('click', () => {
    hideModal();
    selectedFiles = [];
    updateImageGrid();
    updateUI();
    updateDownloadButton(null);
    showNotification('Ready to create a new PDF');
});

// Generate new PDF (reset everything)
newPdfBtn.addEventListener('click', () => {
    if (selectedFiles.length > 0) {
        showModal();
    } else {
        showNotification('Ready to create a new PDF');
    }
});

// Image compression function
async function compressImage(imageData, quality = 0.7) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Calculate new dimensions while maintaining aspect ratio
            let width = img.width;
            let height = img.height;
            const maxDimension = 2000; // Max dimension for PDF quality
            
            if (width > maxDimension || height > maxDimension) {
                if (width > height) {
                    height = (height / width) * maxDimension;
                    width = maxDimension;
                } else {
                    width = (width / height) * maxDimension;
                    height = maxDimension;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Draw and compress
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = imageData;
    });
}

// Progress bar functions
function showProgress() {
    const container = document.getElementById('progressContainer');
    container.classList.add('show');
}

function hideProgress() {
    const container = document.getElementById('progressContainer');
    container.classList.remove('show');
}

function updateProgress(current, total) {
    const percentage = (current / total) * 100;
    const progressFill = document.getElementById('progressBarFill');
    const progressText = document.getElementById('progressText');
    
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `Processing image ${current} of ${total}...`;
}

// Modify the convert button event listener
convertBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;

    try {
        convertBtn.disabled = true;
        convertBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Processing`;
        updateDownloadButton(null);
        showProgress();

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm'
        });

        let processedCount = 0;
        const updateProgressStatus = () => {
            processedCount++;
            updateProgress(processedCount, selectedFiles.length);
        };

        const batchSize = 5;
        for (let i = 0; i < selectedFiles.length; i += batchSize) {
            const batch = selectedFiles.slice(i, Math.min(i + batchSize, selectedFiles.length));
            await Promise.all(batch.map(async (file, batchIndex) => {
                if (i + batchIndex > 0) {
                    doc.addPage();
                }

                const compressedImage = await compressImage(file.data);
                
                await new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => {
                        try {
                            const pageWidth = doc.internal.pageSize.getWidth();
                            const pageHeight = doc.internal.pageSize.getHeight();
                            
                            const imgRatio = img.width / img.height;
                            const pageRatio = pageWidth / pageHeight;
                            
                            let finalWidth = pageWidth;
                            let finalHeight = pageWidth / imgRatio;
                            
                            if (finalHeight > pageHeight) {
                                finalHeight = pageHeight;
                                finalWidth = pageHeight * imgRatio;
                            }
                            
                            const x = (pageWidth - finalWidth) / 2;
                            const y = (pageHeight - finalHeight) / 2;
                            
                            doc.addImage(compressedImage, 'JPEG', x, y, finalWidth, finalHeight);
                            updateProgressStatus();
                            resolve();
                        } catch (err) {
                            reject(err);
                        }
                    };
                    img.onerror = reject;
                    img.src = compressedImage;
                });
            }));
        }

        const pdfBlob = doc.output('blob');
        updateDownloadButton(pdfBlob);
        convertBtn.innerHTML = `<i class="fas fa-check"></i> Conversion Complete`;
        showNotification('PDF created successfully');
        
        setTimeout(() => {
            convertBtn.innerHTML = `<i class="fas fa-file-pdf"></i> Convert to PDF`;
            convertBtn.disabled = false;
            hideProgress();
        }, 2000);

    } catch (error) {
        console.error('Error converting images:', error);
        showNotification('Error creating PDF. Please try again.', 'error');
        convertBtn.innerHTML = `<i class="fas fa-file-pdf"></i> Convert to PDF`;
        convertBtn.disabled = false;
        hideProgress();
    }
}); 
