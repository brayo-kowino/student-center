     
// Import Firebase libraries
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getFirestore, updateDoc, setDoc, getDoc, doc, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteField} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js";



// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC8aA9o_8IK4a5-klFszrJbfxwiIR1W9no",
  authDomain: "my-website-d875f.firebaseapp.com",
  projectId: "my-website-d875f",
  storageBucket: "my-website-d875f.appspot.com",
  messagingSenderId: "1084724880551",
  appId: "1:1084724880551:web:5d6a22cf1a1feb26602782",
  measurementId: "G-54E0SH3VJQ"
};

document.addEventListener('DOMContentLoaded', () => {
    const overflowMenuBar = document.getElementById('overflow-menu-Bar');
    const chatContainer = document.querySelector('.container');
    const backButton = document.getElementById('back-button');
    const menuItems = document.querySelectorAll('.menu-item'); // Assuming your user list items have this class
    
    // Function to show Chat (Mobile)
    function showChatOnMobile() {
        if (window.innerWidth <= 768) {
            chatContainer.classList.add('show-chat');
            overflowMenuBar.classList.add('hide-sidebar');
            backButton.style.display = 'block'; // Show back button
        }
    }

    // Function to show User List (Mobile)
    function showListOnMobile() {
        chatContainer.classList.remove('show-chat');
        overflowMenuBar.classList.remove('hide-sidebar');
        backButton.style.display = 'none'; // Hide back button
    }

    // 1. Attach click event to the container of users (delegation)
    // Use this if your users are added dynamically via JS
    const userListContainer = document.getElementById('overflow-menu');
    userListContainer.addEventListener('click', (e) => {
        // Check if a menu-item was clicked
        if (e.target.closest('.menu-item')) {
            showChatOnMobile();
        }
    });

    // 2. Attach click event to Back Button
    if (backButton) {
        backButton.addEventListener('click', showListOnMobile);
    }

    // 3. Handle Resize (Reset views if switching from mobile to desktop)
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            chatContainer.classList.remove('show-chat');
            overflowMenuBar.classList.remove('hide-sidebar');
            if(backButton) backButton.style.display = 'none';
        }
    });
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // Firestore database
const auth = getAuth(app); // Firebase Auth
const storage = getStorage(app); // Firebase Storage

let currentUser = null;
let currentChatUser = null;
let selectedImage = null;
let userPictures = {};


// Function to display messages to users
const displayMessage = (message, isError = false) => {
  const messageElement = document.createElement('div');
  messageElement.textContent = message;
  console.log("display message triggered with message:", message);
  messageElement.className = isError ? 'error-message' : 'success-message';
  
  // Log the created element to check its properties
  console.log("Message Element:", messageElement);

  document.body.appendChild(messageElement);

  // Remove message after a short delay
  setTimeout(() => {
    messageElement.remove();
    console.log("Message removed from DOM");
  }, 3000);
};
 //document.getElementById('overlay').style.display = 'none';
 const formatLastSeen = (timestamp) => {
  if (timestamp && timestamp.seconds) {
    const date = new Date(timestamp.seconds * 1000);
    const now = new Date();

    // Create date objects without time components for comparison
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Check the difference in days
    const timeDiffInDays = (nowOnly - dateOnly) / (1000 * 60 * 60 * 24); // Convert milliseconds to days

    if (timeDiffInDays < 1) {
      return `Last seen today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}`;
    } else if (timeDiffInDays < 2) {
      return `Last seen yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}`;
    } else {
      return `Last seen on ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}`;
    }
  }
  return ''; // Return empty if no timestamp
};
 // Load users and display their last seen time
const loadUsers = () => {
  const usersRef = collection(db, "users");
  onSnapshot(usersRef, (snapshot) => {
    const userList = document.getElementById('overflow-menu');
    userList.innerHTML = `<h3 class="menu-title"></h3>`;

    snapshot.forEach(doc => {
      const user = doc.data();
      if (user.uid !== currentUser.uid) {
        userPictures[user.uid] = user.profilePicture ? user.profilePicture : 'pic4.png';

        const lastSeen = user.lastSeen ? formatLastSeen(user.lastSeen) : '';
        let statusText = '';
        let statusClass = '';

        if(user.status === 'online') {
          statusText = 'Online';
          statusClass = 'status-online';
        } else if(lastSeen) {
          statusText = lastSeen;
          statusClass = 'status-recent';
        } else {
          statusText = 'Offline';
          statusClass = 'status-offline';
        }

        const menuItem = document.createElement('div');
        menuItem.classList.add('menu-item');
        menuItem.innerHTML = `
          <img src="${userPictures[user.uid]}" alt="Profile Pic" class="profile-pic-small">
          <div>
            <span class="memberUserName">${user.name}</span> <br>
            <span style="color: var(--text-grey); font-size: 13px;" class="${statusClass}">${statusText}</span>
          </div>
        `;

        menuItem.setAttribute('data-uid', user.uid);
        menuItem.addEventListener('click', () => {
          currentChatUser = user.uid;
          updateSelectedUser(user.name, statusText, userPictures[user.uid], user.email, user.bio);
          loadMessages(currentChatUser);
        });

        if (user.name != null && user.name.trim() !== "") {
          userList.appendChild(menuItem);
        }
        
      }
    });
  });
};

document.addEventListener('DOMContentLoaded', () => {
  // Get user info from localStorage
  const userInfo = JSON.parse(localStorage.getItem('currentUser'));
  
  if (userInfo) {
    currentUser = userInfo; // Assign currentUser with the stored information
    console.log("Current user:", currentUser);
    
    // Proceed to load user-specific data
    loadUsers();
  } else {
    // Redirect to authentication page if no user is logged in
   // window.location.href = "authentication.html"; 
  }
});

  document.getElementById('profile-pic').onclick = () => {
  // If there's an active chat with another user, redirect to their profile page
  const uidToShow = currentChatUser || currentUser.uid; // Use currentChatUser UID if set, otherwise fallback to logged-in user
  window.location.href = `profile_page.html?uid=${uidToShow}`;
};

document.getElementById('my-profile-button').onclick = () => {
  // Redirect to the logged-in user's profile page
  window.location.href = `profile_page.html?uid=${currentUser.uid}`;
};

// Function to update Firestore with typing status
const setTypingStatus = (userId, isTyping) => {
  const userRef = doc(db, "users", userId);

  console.log(`Attempting to update typing status to ${isTyping} for user ${userId}`);

  updateDoc(userRef, {
    typing: isTyping
  }).then(() => {
    console.log(`Typing status successfully updated to ${isTyping} for user ${userId}`);
  }).catch((error) => {
    console.error("Error updating typing status:", error);
  });
};

// Start typing detection (called after user is authenticated)
const startTypingDetection = (userId) => {
  const messageInput = document.getElementById('message-input');
  console.log("Starting typing detection...");

  if (!messageInput) {
    console.error("Message input field not found!");
    return;
  }

  console.log("Setting up keypress listener on message input.");

  let typingTimer;
  const typingInterval = 3000; // 3 seconds

  // Event listener for keypress in the message input field
  messageInput.addEventListener('keypress', () => {
    console.log("User is typing...");

    // Clear the timer if the user is still typing
    clearTimeout(typingTimer);

    // Set typing to true in Firestore
    setTypingStatus(userId, true);

    // Set a timer to turn off typing status after 3 seconds of inactivity
    typingTimer = setTimeout(() => {
      console.log("User stopped typing after inactivity.");
      setTypingStatus(userId, false);
    }, typingInterval);
  });

  // Alternatively, use 'input' event if 'keypress' doesn't work
  messageInput.addEventListener('input', () => {
    console.log("User is typing (input event)...");

    clearTimeout(typingTimer);
    setTypingStatus(userId, true);

    typingTimer = setTimeout(() => {
      console.log("User stopped typing after inactivity (input event).");
      setTypingStatus(userId, false);
    }, typingInterval);
  });
};
const userInfo = JSON.parse(localStorage.getItem('currentUser'));
if (userInfo && userInfo.uid) {
    currentUser = userInfo; // Assign currentUser with the stored information
    console.log("Current user:", currentUser);

    // Start typing detection
    startTypingDetection(currentUser.uid);
    loadUsers();
} else {
    console.log("No valid user info found in localStorage. Redirecting to authentication page.");
   // window.location.href = "authentication_section.html"; 
}

// Function to update user's status in text view (with last seen and typing)
const updateUserStatusInTextView = (userId) => {
  const userRef = doc(db, "users", userId);

  onSnapshot(userRef, (doc) => {
    if (doc.exists()) {
      const user = doc.data();
      const lastSeen = user.lastSeen ? formatLastSeen(user.lastSeen) : '';
      let status = user.status === 'online' ? 'Online' : lastSeen ? lastSeen : 'Offline';

      if (user.typing) {
        status = 'Typing...';
      }

      document.getElementById('user-status').textContent = status;
    } else {
      console.log("User document not found!");
    }
  });
};

let idleTimeout = null;
let debounceTimeout = null;


// Function to debounce the status updates
const debounceStatusUpdate = (fn, delay = 2000) => {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(fn, delay);
};

// Function to handle user idle status
const setIdleTimeout = () => {
  clearTimeout(idleTimeout);
  idleTimeout = setTimeout(async () => {
    await setUserOffline();
  }, 5 * 60 * 1000); // Set user offline after 5 minutes of inactivity
};

// Function to set user status to online with debounce
const setUserOnlineDebounced = async () => {
  debounceStatusUpdate(setUserOnline);
};

// Update status on network change
window.addEventListener('online', async () => {
  await setUserOnlineDebounced();
});

window.addEventListener('offline', async () => {
  await setUserOffline();
});

// Listen for user activity to reset idle timer
document.addEventListener('mousemove', setIdleTimeout);
document.addEventListener('keydown', setIdleTimeout);

// Initialize idle timeout when the page loads
setIdleTimeout();

const updateOnlineStatus = async (uid) => {
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, { status: "online", lastSeen: null }, { merge: true });
};
    // Update user online status
  updateOnlineStatus(currentUser.uid);

// Function to set user status to offline
const setUserOffline = async () => {
  if (currentUser) {
    const userRef = doc(db, "users", currentUser.uid);
    await setDoc(userRef, { status: "offline", lastSeen: new Date() }, { merge: true });
  }
};

// Set online status when the user is active
const setUserOnline = async () => {
  if (currentUser) {
    const userRef = doc(db, "users", currentUser.uid);
    await setDoc(userRef, { status: "online", lastSeen: null }, { merge: true });
    }
};



// Listen for visibility changes
document.addEventListener('visibilitychange', async () => {
  if (document.hidden) {
    await setUserOffline();
  } else {
    await setUserOnlineDebounced();
  }
});

// Listen for beforeunload event
window.addEventListener('beforeunload', async () => {
  await setUserOffline();
});

// Update selected user's UI
// Update selected user's UI and display their profile in a dialog
const updateSelectedUser = (name, status, profilePicture, email, bio) => {
  
  // Update the selected user's UI
  document.getElementById('selected-user').textContent = name;
  document.getElementById('user-status').textContent = status;
  document.getElementById('profile-pic').src = profilePicture ? profilePicture : 'pic4.png';

};

  onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;  
    //document.getElementById('overlay').style.display = 'none';
    loadUsers();
    updateOnlineStatus(currentUser.uid);
    
  } else {
    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('overlay').style.display = 'block';
    if (currentUser) {
      updateLastSeen(currentUser); // Update last seen if user signs out
    }
    currentUser = null;
  }
});

// Load messages and use the correct profile picture for each sender
const loadMessages = (chatUserId) => {
    updateUserStatusInTextView(currentChatUser);
    startTypingDetection(currentUser.uid);
    
    const chatId = getChatId(currentUser.uid, chatUserId);
    const messagesRef = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp"));
    
    onSnapshot(messagesRef, (snapshot) => {
        const chatBox = document.getElementById('chat-box');
        chatBox.innerHTML = "";

        chatBox.innerHTML += `
            <div class="encryption-message">
                Messages sent by Connexa are end-to-end encrypted. Nobody outside this chat, not even Connexa, can access or read them.
            </div>
        `;

        snapshot.forEach(doc => {
            const message = doc.data();
            const messageClass = message.senderId === currentUser.uid ? 'sent' : 'received';
            let time, messageText;

            // Check if the message is deleted
            if (message.isDeleted) {
                messageText = message.deletedBy === currentUser.uid 
                    ? "<i>🚫 You deleted this message</i>"
                    : "<i>🚫 This message was deleted by the sender</i>";
                time = formattTime(message.deletedAt); // Use deleted timestamp
            } else {
                messageText = message.text || ""; // Ensure text is defined
                time = formattTime(message.timestamp); // Use original timestamp
            }

            const image = message.image ? `<img src="${message.image}" alt="Image" style="max-width: 100%; height: auto;" class="message-image" />` : '';
            const audio = message.audio ? `<audio controls class="message-audio"><source src="${message.audio}" type="audio/wav">Your browser does not support the audio element.</audio>` : '';
            console.log('Audio URL:', message.audio); // Check the URL

            const profilePic = message.senderId !== currentUser.uid ? 
                `<img src="${userPictures[message.senderId] || 'pic4.png'}" alt="Profile Pic" class="profile-pic" />` : '';

            // Hide status for deleted messages
            const status = message.isDeleted ? '' : message.senderId === currentUser.uid ? `<span class="status">${message.status}</span>` : '';
            const timeStatus = status ? `${time} • ${status}` : time;

            const messageContainer = document.createElement('div');
            messageContainer.className = `message-container ${messageClass} ${message.image || message.audio ? 'has-media' : ''}`;
            messageContainer.innerHTML = `
                ${profilePic}
                <div class="message ${messageClass}">
                    ${messageText}
                    ${image}
                    ${audio} <!-- Include audio if it exists -->
                    <div class="time-status">${timeStatus}</div>
                </div>
            `;

            // Add click event for image to open in full screen
           
            if (message.image) {
                const imgElement = messageContainer.querySelector('.message-image');
                imgElement.addEventListener('click', () => {
                    openFullScreenImage(message.image);
                });
            }
            messageContainer.classList.add('no-select');

            // Add long click listener
            messageContainer.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                
                // Check if the message is sent by the current user
                if (message.senderId === currentUser.uid && !message.isDeleted) {
                    openBottomSheet(doc.ref, message.text, chatId, message); // Pass chatId here
                }
            });

            chatBox.appendChild(messageContainer);

            if (message.senderId !== currentUser.uid && message.status !== "read" && !message.isDeleted) {
                const messageRef = doc.ref;
                updateDoc(messageRef, { status: "read" });
            }
        });

        chatBox.scrollTop = chatBox.scrollHeight;
    });
};

// Function to open image in full screen with overlay and download button
const openFullScreenImage = (src) => {
    // Create the overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'; // Semi-transparent black
    overlay.style.zIndex = '999'; // Layer it above other elements
    overlay.style.cursor = 'pointer'; // Change cursor to pointer

    // Create the full-screen image
    const fullScreenImage = document.createElement('img');
    fullScreenImage.src = src;
    fullScreenImage.style.position = 'absolute';
    fullScreenImage.style.top = '50%';
    fullScreenImage.style.left = '50%';
    fullScreenImage.style.transform = 'translate(-50%, -50%)'; // Center the image
    fullScreenImage.style.maxWidth = '100%';
    fullScreenImage.style.maxHeight = '100%';
    fullScreenImage.style.objectFit = 'contain';
    fullScreenImage.style.zIndex = '1000'; // Layer it above the overlay

    // Create the download button
    const downloadButton = document.createElement('button');
    downloadButton.textContent = 'Download';
    downloadButton.style.position = 'absolute';
    downloadButton.style.top = '20px'; // Position it at the top
    downloadButton.style.right = '20px'; // Position it on the right
    downloadButton.style.padding = '10px 15px';
    downloadButton.style.fontSize = '16px';
    downloadButton.style.color = '#fff';
    downloadButton.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    downloadButton.style.border = 'none';
    downloadButton.style.borderRadius = '5px';
    downloadButton.style.cursor = 'pointer';
    downloadButton.style.zIndex = '1001'; // Layer it above the image

    // Add click event to download the image
    downloadButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent closing the overlay
        const fileName = `image-${new Date().getTime()}.jpg`; // Dynamic filename
        downloadImageToStorage(src, fileName);
    });

    // Add click event to exit full screen
    overlay.addEventListener('click', () => {
        document.body.removeChild(overlay); // Remove the overlay and image from the DOM
    });

    // Append the button, image, and overlay to the body to display them
    overlay.appendChild(fullScreenImage);
    overlay.appendChild(downloadButton);
    document.body.appendChild(overlay);
};

function downloadImageToStorage(url, fileName) {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

const openBottomSheet = (messageRef, currentText, chatId, message) => {
    const bottomSheet = document.createElement('div');
    bottomSheet.className = 'bottom-sheet';

    // Check if the message has an image or audio
    const hasMedia = message.image || message.audio;

    bottomSheet.innerHTML = `
        <div class="options">
            ${!hasMedia ? `<div class="option" id="edit-message">Edit</div>` : ''}
            <div class="option" id="delete-message">Delete</div>
            <div class="close">Close</div>
        </div>
    `;

    document.body.appendChild(bottomSheet);

    // Handle edit message option
    if (!hasMedia) {
        bottomSheet.querySelector('#edit-message').addEventListener('click', () => {
            editMessage(messageRef.id, currentText, chatId); // Pass chatId here
            closeBottomSheet(bottomSheet);
        });
    }

    // Handle delete message option
    bottomSheet.querySelector('#delete-message').addEventListener('click', () => {
        deleteMessage(messageRef.id, chatId); // Call your delete function
        closeBottomSheet(bottomSheet);
    });

    // Handle close action
    bottomSheet.querySelector('.close').addEventListener('click', () => {
        closeBottomSheet(bottomSheet);
    });
};
// Function to handle message editing
const editMessage = (messageId, currentText, chatId) => {
  const bottomSheet = document.createElement('div');
  bottomSheet.className = 'bottom-sheet';

  bottomSheet.innerHTML = `
    <div class="edit-dialog">
      <input type="text" id="edit-message-input" value="${currentText}" />
       <div class="button-container">
      <button id="confirm-edit">Confirm</button>
      <div class="close">Close</div>
    </div>
  `;

  document.body.appendChild(bottomSheet);

  bottomSheet.querySelector('#confirm-edit').addEventListener('click', () => {
    const updatedText = document.getElementById('edit-message-input').value;
    updateMessage(messageId, updatedText, chatId); // Pass chatId here
    closeBottomSheet(bottomSheet);
  });

  bottomSheet.querySelector('.close').addEventListener('click', () => {
    closeBottomSheet(bottomSheet);
  });
};
const deleteMessage = (messageId, chatId) => {
  const messageRef = doc(db, "chats", chatId, "messages", messageId);
  
  // Get the message document to check for an image or audio
  getDoc(messageRef).then(docSnapshot => {
    if (docSnapshot.exists()) {
      const message = docSnapshot.data();
      
      // Check if the message has an image
      if (message.image) {
        // Remove the image from Firebase Storage
        const storage = getStorage();
        const imageRef = ref(storage, message.image); // Assuming `message.image` is the image path
        
        deleteObject(imageRef)
          .then(() => {
            console.log("Image deleted successfully from storage.");
          })
          .catch(error => {
            console.error("Error deleting image from storage: ", error);
          });
      }

      // Check if the message has audio
      if (message.audio) {
        // Remove the audio from Firebase Storage
        const storage = getStorage();
        const audioRef = ref(storage, message.audio); // Assuming `message.audio` is the audio path
        
        deleteObject(audioRef)
          .then(() => {
            console.log("Audio deleted successfully from storage.");
          })
          .catch(error => {
            console.error("Error deleting audio from storage: ", error);
          });
      }

      // Update the message document
      updateDoc(messageRef, { 
        text: "🚫 <i>The message has been deleted</i>",
        isDeleted: true,
        deletedBy: currentUser.uid,
        deletedAt: serverTimestamp(), // Set the timestamp for when the message is deleted
        image: deleteField(), // Remove the image field from the document
        audio: deleteField() // Remove the audio field from the document
      })
      .then(() => {
        console.log("Message updated successfully!");
      })
      .catch(error => {
        console.error("Error updating message: ", error);
      });
      
    } else {
      console.error("Message not found!");
    }
  }).catch(error => {
    console.error("Error fetching message: ", error);
  });
};

// Function to close the bottom sheet
const closeBottomSheet = (bottomSheet) => {
  if (bottomSheet) {
    bottomSheet.remove();
  }
};

// Function to update the message in the database
const updateMessage = (messageId, updatedText, chatId) => {
  const messageRef = doc(db, "chats", chatId, "messages", messageId);
  updateDoc(messageRef, { text: updatedText })
    .then(() => {
      console.log("Message updated successfully!");
    })
    .catch(error => {
      console.error("Error updating message: ", error);
    });
};

// Formatting the time
const formattTime = (timestamp) => {
  if (timestamp && timestamp.seconds) {
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  }
  return ''; // Return empty if no timestamp
};

  const markAsRead = async (chatId, messageId) => {
  const messageRef = doc(db, "chats", chatId, "messages", messageId);
  
  try {
    await updateDoc(messageRef, {
      status: "read",
      readTimestamp: new Date() // Log when it was read
    });
  } catch (error) {
    console.error("Error updating document: ", error);
  }
};
    // Function to format the timestamp
const formatTime = (timestamp) => {
  const date = timestamp.toDate(); // Convert Firestore Timestamp to JS Date
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); // Format as HH:mm
};
  
// Handle image upload and send the message directly
const handleImageUpload = () => {
  const fileInput = document.getElementById("image-input");
  const file = fileInput.files[0];
  
  if (file) {
    const reader = new FileReader();
    
    reader.onloadend = () => {
      const imageDataUrl = reader.result; // Get the image data URL
      const message = "";
      // Call sendMessage directly with the image data URL
      sendMessage(message, imageDataUrl, null); // Send a message with the image

      // Clear the file input for future uploads
      fileInput.value = ''; 
    };
    
    reader.readAsDataURL(file);
  }
};
    // Add event listener for the image input
document.getElementById('image-input').addEventListener('change', handleImageUpload);

// Real-time listener to detect new messages
const listenForMessages = (chatUserId) => {
  const chatId = getChatId(currentUser.uid, chatUserId);
  const messagesRef = collection(db, "chats", chatId, "messages");

  const unsubscribe = onSnapshot(messagesRef, (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === "added") {
        const messageData = change.doc.data();

        // Only observe messages sent by the other user that are still marked as "sent"
        if (messageData.senderId !== currentUser.uid && messageData.status === "sent") {
          const messageElement = document.getElementById(`message-${change.doc.id}`);

          // Use Intersection Observer to detect visibility
          if (messageElement) {
            observeMessageVisibility(chatUserId, change.doc.id, messageElement);
          }
        }
      }
    });
  });

  // Stop listening when user leaves chat
  return unsubscribe;
};

// Observer to detect when the message is visible on the screen
const observeMessageVisibility = (chatUserId, messageId, messageElement) => {
  const observer = new IntersectionObserver(
    async (entries) => {
      entries.forEach(async (entry) => {
        if (entry.isIntersecting) {
          // The message is visible, update its status to "read"
          await updateMessageStatus(chatUserId, messageId, "read");
          observer.unobserve(messageElement); // Stop observing after marking as read
        }
      });
    },
    { threshold: 1.0 } // Fully visible message
  );

  observer.observe(messageElement);
};

// Update message status in Firestore
const updateMessageStatus = async (chatUserId, messageId, newStatus) => {
  const chatId = getChatId(currentUser.uid, chatUserId);
  const messageRef = doc(db, "chats", chatId, "messages", messageId);

  try {
    await setDoc(messageRef, { status: newStatus }, { merge: true }); // Update the status
  } catch (error) {
    console.error("Error updating message status: ", error);
  }
};

  const getChatId = (uid1, uid2) => {
      return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
    };

// sendMessage function to accept an audio URL
const sendMessage = async (message, image, audioURL) => {
  if (!currentChatUser) {
    alert("Please select a user to chat with.");
    return;
  }

  const chatId = getChatId(currentUser.uid, currentChatUser);
  listenForMessages(currentChatUser);

  // Check if both message and audioURL are null, don't send empty messages
  if (!message && !image && !audioURL) {
    console.warn("No message or audio to send.");
    return; // Exit early if no content to send
  }

  try {
    await addDoc(collection(db, "chats", chatId, "messages"), {
      senderId: currentUser.uid,
      text: message || null, // Send the text message
      image: image || null,
      audio: audioURL || null, // Send the audio URL if available
      timestamp: new Date(),
      status: "sent"
    });

    // Reset media after sending
    selectedImage = null;
    selectedAudio = null; // Reset audio after sending
  } catch (error) {
    console.error("Error adding document: ", error);
  }
};


document.addEventListener("DOMContentLoaded", () => {
  const voiceButton = document.getElementById("voice-button");
  const sendAudioButton = document.getElementById("send-audio-button");
  const cancelAudioButton = document.getElementById("cancel-audio-button");

  voiceButton.addEventListener("click", async () => {
    await startRecording(); // Start recording
    openRecordingDialog(); // Show recording dialog
  });

  
 // Event listener for cancel button
  cancelAudioButton.addEventListener("click", () => {
    cancelRecording(); // Call the cancel recording function
  });
});

let mediaStream;
let mediaRecorder;
let audioChunks = [];
let selectedAudio;
let isRecording = false;
let isRecordingCanceled = false; // New flag to check if recording was canceled

// Start recording function
const startRecording = async () => {
  try {
    isRecordingCanceled = false; // Reset the cancel flag
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(mediaStream);
    mediaRecorder.start();

    audioChunks = []; // Reset audio chunks at start

    console.log("Recording started...");

    mediaRecorder.ondataavailable = (event) => {
      console.log("Data available event triggered.");
      audioChunks.push(event.data); // Collect audio chunks
    };

    isRecording = true;
  } catch (error) {
    console.error("Error starting recording: ", error);
  }
};
// Stop recording function with a Promise to wait for onstop to finish
const stopRecording = () => {
  return new Promise((resolve) => {
    if (isRecording) {
      console.log("Stopping recording...");
      mediaRecorder.onstop = () => {
        console.log("Recording stopped. Processing audio chunks...");
        if (!isRecordingCanceled && audioChunks.length > 0) { // Only set audio if recording wasn't canceled
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          selectedAudio = new Blob(audioChunks, { type: 'audio/wav' }); // Create a Blob from audio chunks
                    console.log("Audio Blob created:", selectedAudio); // Log the Blob for debugging
          
        } else {
          console.warn("Recording was canceled or no audio chunks available.");
        }
        audioChunks = []; // Clear audio chunks after processing
        resolve(); // Resolve the Promise after recording has stopped
      };
      mediaRecorder.stop(); // Trigger the onstop event
      mediaStream.getTracks().forEach(track => track.stop()); // Stop the stream
      isRecording = false;
    } else {
      resolve(); // If not recording, resolve immediately
    }
  });
};
const sendAudioButton = document.getElementById("send-audio-button");

sendAudioButton.addEventListener("click", async () => {
    if (isRecording) {
        console.log("Stopping recording and preparing to send audio...");
        await stopRecording(); // Wait for recording to stop and process the audio

        if (selectedAudio) {
            
            const audioURL = await uploadAudio(selectedAudio); // Upload the audio and get the URL
        await sendMessage(null, null, audioURL); // Send the URL instead of the Blob
            closeRecordingDialog(); // Close the dialog after sending
        } else {
            console.warn("No audio to send.");
        }
    }
});
  const uploadAudio = async (audioBlob) => {
  const audioRef = ref(storage, `audio/${Date.now()}.wav`); // Create a unique path for the audio file

  try {
    const snapshot = await uploadBytes(audioRef, audioBlob); // Upload the audio blob
    const downloadURL = await getDownloadURL(snapshot.ref); // Get the download URL
    return downloadURL; // Return the download URL
  } catch (error) {
    console.error("Error uploading audio:", error);
    throw error; // Propagate the error
  }
};


// Cancel recording function
const cancelRecording = () => {
  console.log("Recording canceled.");
  isRecordingCanceled = true; // Set flag to indicate cancellation
  stopRecording(); // Stop the recording
  closeRecordingDialog(); // Close the dialog
  selectedAudio = null; // Reset selectedAudio
  audioChunks = []; // Clear any remaining audio chunks
};

// Function to close the recording dialog
const closeRecordingDialog = () => {
  document.getElementById("recording-dialog").style.display = "none";
  selectedAudio = null; // Reset the audio URL
  audioChunks = []; // Clear the audio chunks
};
// Function to open the recording dialog
const openRecordingDialog = () => {
  document.getElementById("recording-status").textContent = "Recording audio, please speak.";
  document.getElementById("recording-dialog").style.display = "flex";
};

    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('send-button').addEventListener('click', () => {
        const message = document.getElementById('message-input').value;
        if (message.trim() !== "") {
          sendMessage(message);
          document.getElementById('message-input').value = "";
        }
      });
    });    
    // Hide overflow menu when clicking outside
    document.addEventListener('click', (event) => {
      const menu = document.getElementById('overflow-menu');
      const button = document.getElementById('overflow-button');
      if (!menu.contains(event.target) && event.target !== button) {
        //menu.style.display = 'none';
      }
    });