document.addEventListener("DOMContentLoaded", () => {
	const uploadBtn = document.getElementById("uploadBtn");
	const uploadModal = document.getElementById("uploadModal");
	const closeModal = document.getElementById("closeModal");
	const uploadForm = document.getElementById("uploadForm");
	const dropZone = document.getElementById("dropZone");
	const fileInput = document.getElementById("file");
	const fileInfo = document.getElementById("fileInfo");
	const uploadProgress = document.getElementById("uploadProgress");
	const progressBar = document.getElementById("progressBar");
	const progressText = document.getElementById("progressText");
	const notesGrid = document.getElementById("notesGrid");
	const searchInput = document.getElementById("searchInput");
	const searchButton = document.querySelector(".search-button");

	// Modal Controls
	uploadBtn.addEventListener("click", () => {
		uploadModal.classList.add("active");
	});

	closeModal.addEventListener("click", () => {
		uploadModal.classList.remove("active");
		resetForm();
	});

	uploadModal.addEventListener("click", (e) => {
		if (e.target === uploadModal) {
			uploadModal.classList.remove("active");
			resetForm();
		}
	});

	// File Drop Zone
	dropZone.addEventListener("click", () => fileInput.click());

	dropZone.addEventListener("dragover", (e) => {
		e.preventDefault();
		dropZone.classList.add("dragover");
	});

	dropZone.addEventListener("dragleave", () => {
		dropZone.classList.remove("dragover");
	});

	dropZone.addEventListener("drop", (e) => {
		e.preventDefault();
		dropZone.classList.remove("dragover");

		if (e.dataTransfer.files.length) {
			fileInput.files = e.dataTransfer.files;
			updateFileInfo(e.dataTransfer.files[0]);
		}
	});

	fileInput.addEventListener("change", (e) => {
		if (e.target.files.length) {
			updateFileInfo(e.target.files[0]);
		}
	});

	function updateFileInfo(file) {
		fileInfo.style.display = "block";
		fileInfo.innerHTML = `
			<i class="fas fa-file"></i>
			<span>${file.name}</span>
			<span>(${formatFileSize(file.size)})</span>
		`;
	}

	// Form Submission
	uploadForm.addEventListener("submit", async (e) => {
		e.preventDefault();
		const title = document.getElementById("title").value;
		const file = fileInput.files[0];

		if (!file) {
			showNotification("Please select a file", "error");
			return;
		}

		const formData = new FormData();
		formData.append("title", title);
		formData.append("file", file);

		uploadProgress.style.display = "block";
		progressBar.style.width = "0%";
		progressText.textContent = "0%";

		try {
			const xhr = new XMLHttpRequest();
			xhr.open("POST", "/api/notes", true);

			xhr.upload.onprogress = (e) => {
				if (e.lengthComputable) {
					const percentComplete = (e.loaded / e.total) * 100;
					progressBar.style.width = percentComplete + "%";
					progressText.textContent = Math.round(percentComplete) + "%";
				}
			};

			xhr.onload = function () {
				if (xhr.status === 201) {
					showNotification("Note uploaded successfully", "success");
					uploadModal.classList.remove("active");
					resetForm();
					loadNotes();
				} else {
					showNotification("Failed to upload note", "error");
				}
			};

			xhr.onerror = function () {
				showNotification("Failed to upload note", "error");
			};

			xhr.send(formData);
		} catch (error) {
			showNotification("Failed to upload note", "error");
		}
	});

	// Search
	searchButton.addEventListener("click", () => {
		const query = searchInput.value.trim();
		loadNotes(query);
	});

	searchInput.addEventListener("keypress", (e) => {
		if (e.key === "Enter") {
			const query = searchInput.value.trim();
			loadNotes(query);
		}
	});

	// Load Notes
	async function loadNotes(searchQuery = "") {
		try {
			const url = searchQuery
				? `/api/notes/search?query=${encodeURIComponent(searchQuery)}`
				: "/api/notes";

			const response = await fetch(url);
			if (!response.ok) throw new Error("Failed to load notes");

			const notes = await response.json();
			displayNotes(notes);
		} catch (error) {
			showNotification("Failed to load notes", "error");
		}
	}

	function displayNotes(notes) {
		notesGrid.innerHTML = notes.length ? "" : "<p class='no-notes'>No notes found</p>";

		notes.forEach((note) => {
			const card = document.createElement("div");
			card.className = "note-card";

			const uploadDate = new Date(note.uploadDate).toLocaleDateString("en-US", {
				year: "numeric",
				month: "short",
				day: "numeric",
			});

			card.innerHTML = `
				<div class="note-header">
					<h3 class="note-title">${note.title}</h3>
					<span class="note-type">${getFileTypeLabel(note.fileType)}</span>
				</div>
				<div class="note-info">
					<span><i class="far fa-calendar"></i> ${uploadDate}</span>
					<span><i class="fas fa-file-alt"></i> ${formatFileSize(note.fileSize)}</span>
				</div>
				<div class="note-actions">
					<button onclick="downloadNote('${note.filename}')" class="action-button" title="Download">
						<i class="fas fa-download"></i>
						Download
					</button>
				</div>
			`;

			notesGrid.appendChild(card);
		});
	}

	// Utility Functions
	function resetForm() {
		uploadForm.reset();
		fileInfo.style.display = "none";
		uploadProgress.style.display = "none";
		progressBar.style.width = "0%";
		progressText.textContent = "0%";
	}

	function getFileTypeLabel(mimeType) {
		const types = {
			"application/pdf": "PDF",
			"application/msword": "DOC",
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
			"application/vnd.ms-excel": "XLS",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
			"application/vnd.ms-powerpoint": "PPT",
			"application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
			"text/plain": "TXT",
			"image/jpeg": "JPEG",
			"image/png": "PNG",
		};
		return types[mimeType] || "FILE";
	}

	function formatFileSize(bytes) {
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
	}

	function showNotification(message, type) {
		const notification = document.createElement("div");
		notification.className = `notification ${type}`;
		notification.textContent = message;
		document.body.appendChild(notification);
		setTimeout(() => notification.remove(), 3000);
	}

	// Global function for downloading notes
	window.downloadNote = async function (filename) {
		try {
			window.location.href = `/api/notes/download/${filename}`;
		} catch (error) {
			showNotification("Failed to download note", "error");
		}
	};

	// Initial load
	loadNotes();
});
