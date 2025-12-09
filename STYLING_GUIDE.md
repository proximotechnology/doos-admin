# دليل التنسيقات الاحترافية
## Professional Styling Guide

هذا الدليل يشرح كيفية استخدام التنسيقات الموحدة والاحترافية في جميع مكونات التطبيق.

## الملفات المضافة

2. **`assets/js/ui-enhancements.js`** - ملف JavaScript للتحسينات والتفاعلات

## الاستخدام

### 1. الجداول (Tables)

```html
<div class="table-container">
    <div id="tableLoading" class="table-loading hidden">
        <div class="table-loading-spinner"></div>
        <span class="ml-3 text-sm">جاري التحميل...</span>
    </div>
    <div class="table-wrapper">
        <table id="myTable" class="whitespace-nowrap">
            <!-- محتوى الجدول -->
        </table>
    </div>
    <div id="tableEmptyState" class="empty-state hidden">
        <svg class="empty-state-icon">...</svg>
        <h3 class="empty-state-title">لا توجد بيانات</h3>
        <p class="empty-state-description">ابدأ بإضافة بيانات جديدة</p>
    </div>
</div>
```

### 2. النماذج (Forms)

```html
<form class="form-section">
    <div class="form-grid">
        <div class="form-group">
            <label class="form-label form-label-required">الاسم</label>
            <input type="text" class="form-input" required />
            <span class="form-error">هذا الحقل مطلوب</span>
        </div>
        <div class="form-group form-grid-full">
            <label class="form-label">الوصف</label>
            <textarea class="form-textarea"></textarea>
        </div>
    </div>
    <div class="flex justify-end gap-3">
        <button type="submit" class="btn btn-primary">حفظ</button>
        <button type="button" class="btn btn-secondary">إلغاء</button>
    </div>
</form>
```

### 3. الأزرار (Buttons)

```html
<!-- أزرار أساسية -->
<button class="btn btn-primary">أساسي</button>
<button class="btn btn-success">نجاح</button>
<button class="btn btn-danger">خطر</button>
<button class="btn btn-warning">تحذير</button>
<button class="btn btn-info">معلومات</button>
<button class="btn btn-secondary">ثانوي</button>

<!-- أزرار مخططة -->
<button class="btn btn-outline-primary">مخطط أساسي</button>
<button class="btn btn-outline-danger">مخطط خطر</button>

<!-- أحجام مختلفة -->
<button class="btn btn-primary btn-sm">صغير</button>
<button class="btn btn-primary">عادي</button>
<button class="btn btn-primary btn-lg">كبير</button>
```

### 4. الشاشات المنبثقة (Modals)

```html
<!-- استخدام JavaScript -->
<script>
    const modal = Modal.show(`
        <p>محتوى الشاشة المنبثقة</p>
    `, {
        title: 'عنوان الشاشة',
        size: 'lg', // default, lg, xl
        showClose: true,
        onClose: () => {
            console.log('تم الإغلاق');
        }
    });
</script>
```

### 5. الإشعارات (Notifications/Toasts)

```javascript
// استخدام JavaScript
Toast.success('تم الحفظ بنجاح');
Toast.error('حدث خطأ');
Toast.warning('تحذير');
Toast.info('معلومة');

// أو استخدام الدالة القديمة (متوافقة)
coloredToast('success', 'تم الحفظ بنجاح');
```

### 6. حالات التحميل (Loading States)

```html
<!-- Loading Overlay -->
<div class="loading-overlay">
    <div class="loading-content">
        <div class="loading-spinner-large"></div>
        <p>جاري التحميل...</p>
    </div>
</div>

<!-- Table Loading -->
<div class="table-loading">
    <div class="table-loading-spinner"></div>
    <span>جاري التحميل...</span>
</div>
```

### 7. البحث (Search Box)

```html
<div class="search-box-container">
    <div class="relative">
        <svg class="search-box-icon">...</svg>
        <input type="text" class="search-box" placeholder="بحث..." />
    </div>
</div>
```

### 8. الفلاتر (Filters)

```html
<div class="filter-section">
    <h5 class="filter-title">الفلاتر</h5>
    <!-- محتوى الفلاتر -->
    <div class="filter-actions">
        <button class="btn btn-primary">تطبيق</button>
    </div>
</div>
```

### 9. البطاقات (Cards/Panels)

```html
<div class="panel">
    <div class="panel-header">
        <h5 class="panel-title">العنوان</h5>
    </div>
    <div class="panel-body">
        <!-- المحتوى -->
    </div>
    <div class="panel-footer">
        <!-- الأزرار -->
    </div>
</div>
```

### 10. الشارات (Badges)

```html
<span class="badge badge-primary">أساسي</span>
<span class="badge badge-success">نجاح</span>
<span class="badge badge-danger">خطر</span>
<span class="badge badge-warning">تحذير</span>
<span class="badge badge-info">معلومات</span>
```

### 11. حالات فارغة (Empty States)

```html
<div class="empty-state">
    <svg class="empty-state-icon">...</svg>
    <h3 class="empty-state-title">لا توجد بيانات</h3>
    <p class="empty-state-description">ابدأ بإضافة بيانات جديدة</p>
    <div class="empty-state-action">
        <button class="btn btn-primary">إضافة جديد</button>
    </div>
</div>
```

### 12. التصفح (Pagination)

```html
<div class="pagination">
    <div class="pagination-info">
        عرض 1-10 من 100
    </div>
    <div class="pagination-controls">
        <button class="pagination-btn pagination-btn-disabled">السابق</button>
        <button class="pagination-btn pagination-btn-active">1</button>
        <button class="pagination-btn">2</button>
        <button class="pagination-btn">3</button>
        <button class="pagination-btn">التالي</button>
    </div>
</div>
```

## الفئات المتاحة

### Tables
- `.table-container` - حاوية الجدول
- `.table-wrapper` - غلاف الجدول
- `.table-loading` - حالة التحميل
- `.table-loading-spinner` - مؤشر التحميل
- `.table-action-btn` - أزرار الإجراءات
- `.table-action-btn-primary` - زر أساسي
- `.table-action-btn-success` - زر نجاح
- `.table-action-btn-danger` - زر خطر

### Forms
- `.form-section` - قسم النموذج
- `.form-group` - مجموعة الحقول
- `.form-label` - تسمية الحقل
- `.form-label-required` - حقل مطلوب
- `.form-input` - حقل نصي
- `.form-select` - قائمة منسدلة
- `.form-textarea` - منطقة نصية
- `.form-error` - رسالة خطأ
- `.form-help` - نص مساعد
- `.form-grid` - شبكة النموذج
- `.form-grid-full` - عمود كامل

### Buttons
- `.btn` - زر أساسي
- `.btn-primary` - زر أساسي
- `.btn-success` - زر نجاح
- `.btn-danger` - زر خطر
- `.btn-warning` - زر تحذير
- `.btn-info` - زر معلومات
- `.btn-secondary` - زر ثانوي
- `.btn-outline-primary` - زر مخطط
- `.btn-sm` - حجم صغير
- `.btn-lg` - حجم كبير

### Modals
- `.modal-overlay` - خلفية الشاشة المنبثقة
- `.modal-container` - حاوية الشاشة
- `.modal-container-lg` - حجم كبير
- `.modal-container-xl` - حجم كبير جداً
- `.modal-header` - رأس الشاشة
- `.modal-title` - عنوان الشاشة
- `.modal-close` - زر الإغلاق
- `.modal-body` - جسم الشاشة
- `.modal-footer` - تذييل الشاشة

### Notifications
- `.toast` - إشعار
- `.toast-success` - إشعار نجاح
- `.toast-error` - إشعار خطأ
- `.toast-warning` - إشعار تحذير
- `.toast-info` - إشعار معلومات
- `.toast-icon` - أيقونة الإشعار
- `.toast-content` - محتوى الإشعار
- `.toast-title` - عنوان الإشعار
- `.toast-message` - رسالة الإشعار
- `.toast-close` - زر الإغلاق

## JavaScript APIs

### Toast
```javascript
Toast.show(message, type, duration);
Toast.success(message, duration);
Toast.error(message, duration);
Toast.warning(message, duration);
Toast.info(message, duration);
```

### Modal
```javascript
const modal = Modal.show(content, options);
Modal.close(modal);
```

### LoadingManager
```javascript
LoadingManager.show(target, message);
LoadingManager.hide();
```

## أمثلة عملية

راجع الملفات التالية لأمثلة عملية:
- `renter/components/CarManagement/CarManagement.html`
- `renter/components/BrandManagement/BrandManagement.html`

## ملاحظات

1. جميع التنسيقات متوافقة مع الوضع الداكن (Dark Mode)
2. التنسيقات متجاوبة (Responsive) وتعمل على جميع الأجهزة
3. التنسيقات تدعم RTL و LTR
4. جميع التنسيقات تستخدم Tailwind CSS


