/**
 * tilt.js
 * Hiệu ứng nghiêng điện thoại: ảnh dịch chuyển theo độ nghiêng của máy.
 *
 * Lưu ý về quyền:
 * - Android / Chrome: sự kiện deviceorientation chạy ngay, không cần xin phép.
 * - iOS 13+ / Safari: bắt buộc gọi DeviceOrientationEvent.requestPermission()
 *   từ một thao tác chạm thật của người dùng, nên phải hiện nút mời chạm.
 * - Cả hai đều yêu cầu trang chạy qua HTTPS.
 *
 * Khi hiệu ứng nghiêng bật, animation trôi (floatA/B/C trong style.css) sẽ
 * được tắt trên từng ảnh để hai transform không ghi đè lẫn nhau.
 */
(function () {
	'use strict';

	var MOBILE_QUERY = '(max-width: 52.99em)';
	var MAX_SHIFT = 18;      // biên độ dịch tối đa mỗi trục (px)
	var MAX_TILT = 30;       // góc nghiêng (độ) tương ứng biên độ tối đa
	var SMOOTHING = 0.08;    // hệ số làm mượt, càng nhỏ càng mượt/chậm

	// Chỉ chạy trên màn hình hẹp
	if (!window.matchMedia(MOBILE_QUERY).matches) {
		return;
	}

	if (!window.DeviceOrientationEvent) {
		return;
	}

	// Tôn trọng cài đặt giảm chuyển động của hệ thống
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
		return;
	}

	var images = [];
	var target = { x: 0, y: 0 };
	var current = { x: 0, y: 0 };
	var running = false;

	/**
	 * Giới hạn giá trị trong khoảng [min, max]
	 */
	function clamp(value, min, max) {
		return Math.min(Math.max(value, min), max);
	}

	/**
	 * Nội suy tuyến tính để chuyển động mượt thay vì giật theo từng mẫu cảm biến
	 */
	function lerp(from, to, amount) {
		return from + (to - from) * amount;
	}

	/**
	 * Thu thập các phần tử ảnh và tắt animation trôi của CSS trên chúng
	 */
	function collectImages() {
		images = Array.prototype.slice.call(
			document.querySelectorAll('.grid__item-img')
		);

		images.forEach(function (el, index) {
			// setProperty với 'important' để thắng rule !important trong style.css
			el.style.setProperty('animation', 'none', 'important');
			// Mỗi ảnh phản ứng mạnh/nhẹ khác nhau cho có chiều sâu
			el.dataset.tiltDepth = (0.6 + (index % 4) * 0.2).toFixed(2);
		});
	}

	/**
	 * Vòng lặp vẽ: làm mượt giá trị rồi áp transform lên từng ảnh
	 */
	function render() {
		current.x = lerp(current.x, target.x, SMOOTHING);
		current.y = lerp(current.y, target.y, SMOOTHING);

		for (var i = 0; i < images.length; i++) {
			var el = images[i];
			var depth = parseFloat(el.dataset.tiltDepth) || 1;
			var tx = (current.x * depth).toFixed(2);
			var ty = (current.y * depth).toFixed(2);
			var rotate = (current.x * depth * 0.06).toFixed(2);

			el.style.setProperty(
				'transform',
				'translate3d(' + tx + 'px, ' + ty + 'px, 0) rotate(' + rotate + 'deg)',
				'important'
			);
		}

		requestAnimationFrame(render);
	}

	/**
	 * Xử lý dữ liệu cảm biến.
	 * gamma: nghiêng trái/phải (-90..90), beta: nghiêng trước/sau (-180..180)
	 */
	function onOrientation(ev) {
		if (ev.gamma === null && ev.beta === null) {
			return;
		}

		var gamma = clamp(ev.gamma || 0, -MAX_TILT, MAX_TILT);
		var beta = clamp((ev.beta || 0) - 45, -MAX_TILT, MAX_TILT);

		target.x = (gamma / MAX_TILT) * MAX_SHIFT;
		target.y = (beta / MAX_TILT) * MAX_SHIFT;
	}

	/**
	 * Bắt đầu lắng nghe cảm biến
	 */
	function start() {
		if (running) {
			return;
		}
		running = true;

		collectImages();
		window.addEventListener('deviceorientation', onOrientation);
		requestAnimationFrame(render);
	}

	/**
	 * iOS 13+ cần xin quyền từ thao tác chạm. Hiện nút mời người dùng chạm.
	 */
	function showPermissionButton() {
		var btn = document.createElement('button');
		btn.type = 'button';
		btn.className = 'tilt-enable';
		btn.textContent = 'Chạm để bật hiệu ứng nghiêng';
		document.body.appendChild(btn);

		btn.addEventListener('click', function () {
			DeviceOrientationEvent.requestPermission()
				.then(function (state) {
					if (state === 'granted') {
						start();
					}
					btn.remove();
				})
				.catch(function () {
					// Người dùng từ chối hoặc trình duyệt chặn: giữ animation trôi sẵn có
					btn.remove();
				});
		});
	}

	// Chờ ảnh được script.js khởi tạo xong rồi mới gắn hiệu ứng
	window.addEventListener('load', function () {
		var needsPermission =
			typeof DeviceOrientationEvent.requestPermission === 'function';

		if (needsPermission) {
			showPermissionButton();
		} else {
			start();
		}
	});
})();
