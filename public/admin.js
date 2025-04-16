document.addEventListener("DOMContentLoaded", () => {
	const loginForm = document.getElementById("loginForm");
	const adminDashboard = document.getElementById("adminDashboard");
	const adminLoginForm = document.getElementById("adminLoginForm");
	const logoutBtn = document.getElementById("logoutBtn");
	const adminSearchInput = document.getElementById("adminSearchInput");
	const adminSearchBtn = document.getElementById("adminSearchBtn");
	const notesTableBody = document.getElementById("notesTableBody");
	const totalNotesElement = document.getElementById("totalNotes");
	const totalStorageElement = document.getElementById("totalStorage");

	// Check if user is already logged in
	const token = localStorage.getItem("adminToken");
	if (token) {
		showDashboard();
		loadDashboardData();
	}

	// Event Listeners
	adminLoginForm.addEventListener("submit", async (e) => {
		e.preventDefault();
		const username = document.getElementById("username").value;
		const password = document.getElementById("password").value;

		try {
			const response = await fetch("/api/admin/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ username, password }),
			});

			const data = await response.json();

			if (response.ok) {
				localStorage.setItem("adminToken", data.token);
				showDashboard();
				loadDashboardData();
			} else {
				showNotification(data.error, "error");
			}
		} catch (error) {
			showNotification("Login failed", "error");
		}
	});

	logoutBtn.addEventListener("click", () => {
		localStorage.removeItem("adminToken");
		showLoginForm();
	});

	adminSearchBtn.addEventListener("click", () => {
		loadNotes(adminSearchInput.value);
	});

	adminSearchInput.addEventListener("keypress", (e) => {
		if (e.key === "Enter") {
			loadNotes(adminSearchInput.value);
		}
	});

	// Functions
	function showDashboard() {
		loginForm.style.display = "none";
		adminDashboard.style.display = "block";
	}

	function showLoginForm() {
		loginForm.style.display = "block";
		adminDashboard.style.display = "none";
		adminLoginForm.reset();
	}

	async function loadDashboardData() {
		try {
			const response = await fetch("/api/admin/stats", {
				headers: {
					Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
				},
			});

			if (response.ok) {
				const data = await response.json();
				updateDashboardStats(data);
				loadNotes();
			} else {
				handleAuthError(response);
			}
		} catch (error) {
			showNotification("Error loading dashboard data", "error");
		}
	}

	async function loadNotes(searchQuery = "") {
		try {
			const url = searchQuery
				? `/api/notes/search?query=${encodeURIComponent(searchQuery)}`
				: "/api/notes";

			const response = await fetch(url);
			const notes = await response.json();
			displayNotes(notes);
		} catch (error) {
			showNotification("Error loading notes", "error");
		}
	}

	function displayNotes(notes) {
		notesTableBody.innerHTML = "";

		notes.forEach((note) => {
			const row = document.createElement("tr");
			const uploadDate = new Date(note.uploadDate).toLocaleDateString("en-US", {
				year: "numeric",
				month: "short",
				day: "numeric",
			});

			row.innerHTML = `
                <td>${note.title}</td>
                <td>${note.fileType}</td>
                <td>${formatFileSize(note.fileSize)}</td>
                <td>${uploadDate}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-button" onclick="window.open('${
													note.fileUrl
												}', '_blank')" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-button delete" onclick="deleteNote('${
													note._id
												}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;

			notesTableBody.appendChild(row);
		});
	}

	function updateDashboardStats(data) {
		totalNotesElement.textContent = data.totalNotes;
		totalStorageElement.textContent = formatFileSize(data.totalSize);
	}

	function formatFileSize(bytes) {
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
	}

	function handleAuthError(response) {
		if (response.status === 401 || response.status === 403) {
			localStorage.removeItem("adminToken");
			showLoginForm();
			showNotification("Session expired. Please login again.", "error");
		}
	}

	function showNotification(message, type) {
		const notification = document.createElement("div");
		notification.className = `notification ${type}`;
		notification.textContent = message;

		document.body.appendChild(notification);

		setTimeout(() => {
			notification.remove();
		}, 3000);
	}

	// Global function for deleting notes
	window.deleteNote = async function (noteId) {
		if (!confirm("Are you sure you want to delete this note?")) {
			return;
		}

		try {
			const response = await fetch(`/api/admin/notes/${noteId}`, {
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
				},
			});

			if (response.ok) {
				showNotification("Note deleted successfully", "success");
				loadDashboardData();
			} else {
				const data = await response.json();
				showNotification(data.error, "error");
			}
		} catch (error) {
			showNotification("Error deleting note", "error");
		}
	};
});
