document.addEventListener('DOMContentLoaded', function() {
    // DOM elementlerini seçme
    const uploadArea = document.getElementById('uploadArea');
    const uploadButton = document.getElementById('uploadButton');
    const imageUpload = document.getElementById('imageUpload');
    const previewArea = document.getElementById('previewArea');
    const imagePreview = document.getElementById('imagePreview');
    const generateButton = document.getElementById('generateButton');
    const resetButton = document.getElementById('resetButton');
    const resultSection = document.getElementById('resultSection');
    const loader = document.getElementById('loader');
    const resultContent = document.getElementById('resultContent');
    const captionText = document.getElementById('captionText');
    const hashtagText = document.getElementById('hashtagText');
    const copyCaption = document.getElementById('copyCaption');
    const copyHashtags = document.getElementById('copyHashtags');

    // Gemini API anahtarı
    const API_KEY = 'AIzaSyAHGevOsfDUchebvfihC1u7sWK8NMIOyqY'; // Netlify'da çevre değişkeni olarak ayarlanacak
    const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent';

    // Fotoğraf yükleme işlemleri
    uploadButton.addEventListener('click', () => {
        imageUpload.click();
    });

    uploadArea.addEventListener('click', () => {
        imageUpload.click();
    });

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('active');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('active');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('active');
        
        if (e.dataTransfer.files.length) {
            imageUpload.files = e.dataTransfer.files;
            displayPreview(e.dataTransfer.files[0]);
        }
    });

    imageUpload.addEventListener('change', (e) => {
        if (e.target.files.length) {
            displayPreview(e.target.files[0]);
        }
    });

    // Fotoğraf önizleme fonksiyonu
    function displayPreview(file) {
        if (!file.type.match('image.*')) {
            alert('Lütfen bir resim dosyası yükleyin!');
            return;
        }

        const reader = new FileReader();
        
        reader.onload = function(e) {
            uploadArea.style.display = 'none';
            previewArea.style.display = 'flex';
            imagePreview.src = e.target.result;
            generateButton.disabled = false;
        }
        
        reader.readAsDataURL(file);
    }

    // Sıfırlama butonu
    resetButton.addEventListener('click', () => {
        uploadArea.style.display = 'block';
        previewArea.style.display = 'none';
        resultSection.style.display = 'none';
        imageUpload.value = '';
        imagePreview.src = '';
        generateButton.disabled = true;
    });

    // Açıklama oluşturma butonu
    generateButton.addEventListener('click', async () => {
        resultSection.style.display = 'block';
        loader.style.display = 'flex';
        resultContent.style.display = 'none';
        
        try {
            const imageBase64 = imagePreview.src.split(',')[1];
            const result = await generateCaptionAndHashtags(imageBase64);
            
            if (result) {
                displayResults(result);
            } else {
                throw new Error('Sonuç alınamadı');
            }
        } catch (error) {
            console.error('Hata:', error);
            alert('Açıklama oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
        } finally {
            loader.style.display = 'none';
        }
    });

    // Gemini API ile açıklama ve hashtag oluşturma
    async function generateCaptionAndHashtags(imageBase64) {
        const apiKey = API_KEY;
        const url = `${API_URL}?key=${apiKey}`;

        const requestData = {
            contents: [{
                parts: [
                    {
                        text: "Bu fotoğraf için Instagram'da kullanılabilecek, algoritma dostu, en fazla 5 satır uzunluğunda bir açıklama ve en fazla 5 adet ilgili hashtag oluştur. Açıklamayı ve hashtag'leri ayrı ayrı döndür. Türkçe olarak yanıt ver."
                    },
                    {
                        inline_data: {
                            mime_type: "image/jpeg",
                            data: imageBase64
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 800
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            throw new Error(`API hatası: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates.length > 0) {
            const text = data.candidates[0].content.parts[0].text;
            
            // Açıklama ve hashtag'leri ayırma
            const parts = processApiResponse(text);
            return parts;
        }
        
        return null;
    }

    // API yanıtını işleme
    function processApiResponse(text) {
        let caption = '';
        let hashtags = '';

        // Açıklama ve hashtag'leri ayırma
        if (text.includes('Hashtag') || text.includes('hashtag') || text.includes('#')) {
            const lines = text.split('\n');
            let captionStarted = false;
            let hashtagStarted = false;
            
            for (const line of lines) {
                const trimmedLine = line.trim();
                
                if (trimmedLine === '') continue;
                
                if (trimmedLine.includes('Açıklama') || trimmedLine.includes('açıklama') || trimmedLine.includes('AÇIKLAMA')) {
                    captionStarted = true;
                    continue;
                }
                
                if (trimmedLine.includes('Hashtag') || trimmedLine.includes('hashtag') || trimmedLine.includes('HASHTAG')) {
                    captionStarted = false;
                    hashtagStarted = true;
                    continue;
                }
                
                if (captionStarted && !hashtagStarted) {
                    caption += trimmedLine + '\n';
                }
                
                if (hashtagStarted) {
                    if (trimmedLine.startsWith('#')) {
                        hashtags += trimmedLine + ' ';
                    } else if (trimmedLine.includes('#')) {
                        hashtags += trimmedLine + ' ';
                    } else {
                        const words = trimmedLine.split(' ');
                        for (const word of words) {
                            if (word.startsWith('#')) {
                                hashtags += word + ' ';
                            }
                        }
                    }
                }
            }
        } else {
            // Eğer belirgin bir ayrım yoksa, metni ikiye böl
            const lines = text.split('\n').filter(line => line.trim() !== '');
            const midPoint = Math.ceil(lines.length / 2);
            
            caption = lines.slice(0, midPoint).join('\n');
            
            // Hashtag'leri bul
            const hashtagLines = lines.slice(midPoint);
            for (const line of hashtagLines) {
                if (line.includes('#')) {
                    hashtags += line + ' ';
                }
            }
            
            // Hashtag bulunamadıysa
            if (!hashtags) {
                hashtags = '#instagram #photo #lifestyle #photography #trending';
            }
        }
        
        return {
            caption: caption.trim(),
            hashtags: hashtags.trim()
        };
    }

    // Sonuçları gösterme
    function displayResults(result) {
        captionText.textContent = result.caption;
        hashtagText.textContent = result.hashtags;
        resultContent.style.display = 'block';
    }

    // Kopyalama butonları
    copyCaption.addEventListener('click', () => {
        copyToClipboard(captionText.textContent);
        showCopyFeedback(copyCaption);
    });

    copyHashtags.addEventListener('click', () => {
        copyToClipboard(hashtagText.textContent);
        showCopyFeedback(copyHashtags);
    });

    // Panoya kopyalama fonksiyonu
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text)
            .catch(err => {
                console.error('Kopyalama hatası:', err);
            });
    }

    // Kopyalama geri bildirimi
    function showCopyFeedback(button) {
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i> Kopyalandı';
        
        setTimeout(() => {
            button.innerHTML = originalText;
        }, 2000);
    }
}); 
