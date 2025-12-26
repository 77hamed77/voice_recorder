// ==========================================
// تعريف العناصر من صفحة HTML
// ==========================================
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusText = document.getElementById('status');
const visualizer = document.getElementById('visualizer');
const recordingsList = document.getElementById('recordingsList');
const clearBtn = document.getElementById('clearBtn');

// متغيرات للتعامل مع المسجل
let mediaRecorder;
let audioChunks = [];

// ==========================================
// 1. عند تحميل الصفحة: استرجاع التسجيلات القديمة
// ==========================================
document.addEventListener('DOMContentLoaded', loadRecordings);

// ==========================================
// 2. وظيفة بدء التسجيل
// ==========================================
startBtn.addEventListener('click', async () => {
    try {
        // طلب إذن الميكروفون
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        // تجميع قطع الصوت أثناء التسجيل
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        // عند انتهاء التسجيل
        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            saveRecording(audioBlob);
        };

        // بدء التسجيل الفعلي
        mediaRecorder.start();
        
        // تحديث واجهة المستخدم
        startBtn.disabled = true;
        stopBtn.disabled = false;
        statusText.textContent = "جاري التسجيل... 🎙️";
        statusText.style.color = "#dc3545"; // لون أحمر للتنبيه
        visualizer.classList.remove('hidden');

    } catch (err) {
        // عرض رسالة خطأ جميلة في حال رفض الميكروفون
        Swal.fire({
            icon: 'error',
            title: 'عذراً...',
            text: 'يجب السماح بالوصول للميكروفون لكي يعمل التسجيل!',
            confirmButtonText: 'حسناً',
            confirmButtonColor: '#183b65',
            background: '#f5f8ff',
            color: '#183b65'
        });
        console.error(err);
    }
});

// ==========================================
// 3. وظيفة إيقاف التسجيل
// ==========================================
stopBtn.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        
        // تحديث واجهة المستخدم
        startBtn.disabled = false;
        stopBtn.disabled = true;
        statusText.textContent = "تم الحفظ بنجاح! ✅";
        statusText.style.color = "#183b65";
        visualizer.classList.add('hidden');
        
        // إيقاف عمل الميكروفون (لإطفاء ضوء التسجيل في المتصفح)
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
});

// ==========================================
// 4. معالجة وحفظ التسجيل في LocalStorage
// ==========================================
function saveRecording(blob) {
    const reader = new FileReader();
    reader.readAsDataURL(blob); // تحويل ملف الصوت إلى نص (Base64)
    
    reader.onloadend = () => {
        const base64Audio = reader.result;
        const timestamp = new Date().toLocaleString('ar-SY');
        
        // إنشاء كائن التسجيل
        const recording = {
            id: Date.now(), // رقم مميز للتسجيل
            date: timestamp,
            audio: base64Audio
        };

        // جلب القائمة القديمة وإضافة الجديد
        const savedRecordings = JSON.parse(localStorage.getItem('voice_recordings') || '[]');
        savedRecordings.push(recording);
        localStorage.setItem('voice_recordings', JSON.stringify(savedRecordings));

        // عرض التسجيل الجديد فوراً
        displayRecording(recording);
    };
}

// ==========================================
// 5. عرض تسجيل واحد في القائمة (HTML)
// ==========================================
function displayRecording(recording) {
    const li = document.createElement('li');
    li.setAttribute('data-id', recording.id); // لتسهيل الحذف لاحقاً
    
    // تصميم عنصر القائمة
    li.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:5px; width: 100%;">
            <div style="font-size: 0.8rem; font-weight:bold; color:#183b65;">${recording.date}</div>
            <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
                <audio controls src="${recording.audio}" style="height:30px; flex-grow:1;"></audio>
                <button onclick="deleteSingleRecording(${recording.id})" 
                        style="background:none; border:none; cursor:pointer; font-size:1.2rem;" 
                        title="حذف هذا التسجيل">
                    ❌
                </button>
            </div>
        </div>
    `;
    recordingsList.appendChild(li);
}

// ==========================================
// 6. تحميل كل التسجيلات عند الفتح
// ==========================================
function loadRecordings() {
    const savedRecordings = JSON.parse(localStorage.getItem('voice_recordings') || '[]');
    recordingsList.innerHTML = ''; // تنظيف القائمة أولاً
    
    if (savedRecordings.length === 0) {
        recordingsList.innerHTML = '<p style="text-align:center; color:#888; font-size:0.9rem;">لا توجد تسجيلات محفوظة.</p>';
    } else {
        savedRecordings.forEach(displayRecording);
    }
}

// ==========================================
// 7. حذف تسجيل واحد فقط (ميزة جديدة)
// ==========================================
window.deleteSingleRecording = function(id) {
    Swal.fire({
        title: 'حذف التسجيل؟',
        text: "لن يمكنك استعادته مرة أخرى.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#183b65',
        confirmButtonText: 'نعم، احذفه',
        cancelButtonText: 'إلغاء'
    }).then((result) => {
        if (result.isConfirmed) {
            // 1. جلب البيانات
            let savedRecordings = JSON.parse(localStorage.getItem('voice_recordings') || '[]');
            // 2. تصفية القائمة (حذف العنصر صاحب الـ id)
            savedRecordings = savedRecordings.filter(rec => rec.id !== id);
            // 3. الحفظ الجديد
            localStorage.setItem('voice_recordings', JSON.stringify(savedRecordings));
            // 4. تحديث العرض
            loadRecordings();
            
            Swal.fire({
                title: 'تم الحذف!',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
        }
    });
};

// ==========================================
// 8. حذف جميع التسجيلات (بتصميم SweetAlert2)
// ==========================================
clearBtn.addEventListener('click', () => {
    const savedRecordings = JSON.parse(localStorage.getItem('voice_recordings') || '[]');
    
    if (savedRecordings.length === 0) {
        Swal.fire({
            text: 'القائمة فارغة بالفعل!',
            icon: 'info',
            confirmButtonColor: '#183b65'
        });
        return;
    }

    Swal.fire({
        title: 'هل أنت متأكد؟',
        text: "سيتم حذف جميع التسجيلات ولن يمكنك استعادتها!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545', // لون أحمر للحذف
        cancelButtonColor: '#183b65', // لون أزرق الجامعة للإلغاء
        confirmButtonText: 'نعم، احذف الكل',
        cancelButtonText: 'إلغاء',
        background: '#fff',
        color: '#183b65'
    }).then((result) => {
        if (result.isConfirmed) {
            // تنفيذ الحذف
            localStorage.removeItem('voice_recordings');
            loadRecordings(); // إعادة تحميل القائمة (ستظهر رسالة "لا توجد تسجيلات")
            statusText.textContent = "تم حذف السجل";
            
            Swal.fire({
                title: 'تم الحذف!',
                text: 'سجل التسجيلات أصبح فارغاً الآن.',
                icon: 'success',
                confirmButtonColor: '#b9955c',
                confirmButtonText: 'ممتاز'
            });
        }
    });
});