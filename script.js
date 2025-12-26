// ==========================================
// تعريف العناصر
// ==========================================
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusText = document.getElementById('status');
const visualizer = document.getElementById('visualizer');
const recordingsList = document.getElementById('recordingsList');
const clearBtn = document.getElementById('clearBtn');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = themeToggle.querySelector('i');

let mediaRecorder;
let audioChunks = [];

// ==========================================
// 0. إدارة الوضع الليلي/النهاري
// ==========================================
// التحقق من الوضع المحفوظ أو تفضيلات النظام
const currentTheme = localStorage.getItem('theme') || 
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

document.documentElement.setAttribute('data-theme', currentTheme);
updateThemeIcon(currentTheme);

themeToggle.addEventListener('click', () => {
    let targetTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', targetTheme);
    localStorage.setItem('theme', targetTheme);
    updateThemeIcon(targetTheme);
});

function updateThemeIcon(theme) {
    if (theme === 'dark') {
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    } else {
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
    }
}

// دالة مساعدة لجلب ألوان التنبيهات حسب الوضع
function getSwalColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
        bg: isDark ? '#082c58' : '#fff',
        color: isDark ? '#fff' : '#183b65',
        confirmBtn: isDark ? '#b9955c' : '#183b65',
        cancelBtn: isDark ? '#183b65' : '#dc3545'
    };
}

// ==========================================
// 1. عند تحميل الصفحة
// ==========================================
document.addEventListener('DOMContentLoaded', loadRecordings);

// ==========================================
// 2. بدء التسجيل
// ==========================================
startBtn.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => audioChunks.push(event.data);

        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            saveRecording(audioBlob);
        };

        mediaRecorder.start();
        
        startBtn.disabled = true;
        stopBtn.disabled = false;
        statusText.textContent = "جاري التسجيل... 🎙️";
        statusText.style.color = "#dc3545";
        visualizer.classList.remove('hidden');

    } catch (err) {
        const colors = getSwalColors();
        Swal.fire({
            icon: 'error',
            title: 'عذراً...',
            text: 'يجب السماح بالوصول للميكروفون!',
            confirmButtonColor: colors.confirmBtn,
            background: colors.bg,
            color: colors.color
        });
    }
});

// ==========================================
// 3. إيقاف التسجيل
// ==========================================
stopBtn.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        startBtn.disabled = false;
        stopBtn.disabled = true;
        statusText.textContent = "تم الحفظ بنجاح! ✅";
        statusText.style.color = "var(--text-primary)";
        visualizer.classList.add('hidden');
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
});

// ==========================================
// 4. الحفظ في LocalStorage
// ==========================================
function saveRecording(blob) {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    
    reader.onloadend = () => {
        const recording = {
            id: Date.now(),
            date: new Date().toLocaleString('ar-SY'),
            audio: reader.result
        };

        const savedRecordings = JSON.parse(localStorage.getItem('voice_recordings') || '[]');
        savedRecordings.push(recording);
        localStorage.setItem('voice_recordings', JSON.stringify(savedRecordings));
        displayRecording(recording);
    };
}

// ==========================================
// 5. عرض التسجيل
// ==========================================
function displayRecording(recording) {
    const li = document.createElement('li');
    li.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:5px; width: 100%;">
            <div style="font-size: 0.8rem; font-weight:bold; color:var(--text-secondary);">${recording.date}</div>
            <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
                <audio controls src="${recording.audio}" style="flex-grow:1;"></audio>
                <button onclick="deleteSingleRecording(${recording.id})" 
                        style="background:none; border:none; cursor:pointer; font-size:1.2rem; color:#dc3545;" 
                        title="حذف">
                    <i class="fas fa-times-circle"></i>
                </button>
            </div>
        </div>
    `;
    recordingsList.appendChild(li);
}

// ==========================================
// 6. تحميل التسجيلات
// ==========================================
function loadRecordings() {
    const savedRecordings = JSON.parse(localStorage.getItem('voice_recordings') || '[]');
    recordingsList.innerHTML = '';
    
    if (savedRecordings.length === 0) {
        recordingsList.innerHTML = '<p style="text-align:center; color:var(--text-secondary); font-size:0.9rem;">لا توجد تسجيلات محفوظة.</p>';
    } else {
        savedRecordings.forEach(displayRecording);
    }
}

// ==========================================
// 7. حذف تسجيل واحد
// ==========================================
window.deleteSingleRecording = function(id) {
    const colors = getSwalColors();
    Swal.fire({
        title: 'حذف التسجيل؟',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: colors.confirmBtn,
        confirmButtonText: 'نعم، احذفه',
        cancelButtonText: 'إلغاء',
        background: colors.bg,
        color: colors.color
    }).then((result) => {
        if (result.isConfirmed) {
            let savedRecordings = JSON.parse(localStorage.getItem('voice_recordings') || '[]');
            savedRecordings = savedRecordings.filter(rec => rec.id !== id);
            localStorage.setItem('voice_recordings', JSON.stringify(savedRecordings));
            loadRecordings();
            
            Swal.fire({
                title: 'تم الحذف!',
                icon: 'success',
                timer: 1000,
                showConfirmButton: false,
                background: colors.bg,
                color: colors.color
            });
        }
    });
};

// ==========================================
// 8. حذف الكل
// ==========================================
clearBtn.addEventListener('click', () => {
    const savedRecordings = JSON.parse(localStorage.getItem('voice_recordings') || '[]');
    const colors = getSwalColors();

    if (savedRecordings.length === 0) return;

    Swal.fire({
        title: 'هل أنت متأكد؟',
        text: "سيتم حذف جميع التسجيلات!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: colors.confirmBtn,
        confirmButtonText: 'نعم، احذف الكل',
        cancelButtonText: 'إلغاء',
        background: colors.bg,
        color: colors.color
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem('voice_recordings');
            loadRecordings();
            statusText.textContent = "تم حذف السجل";
            
            Swal.fire({
                title: 'تم الحذف!',
                icon: 'success',
                confirmButtonColor: colors.confirmBtn,
                background: colors.bg,
                color: colors.color
            });
        }
    });
});
// python3 -m http.server