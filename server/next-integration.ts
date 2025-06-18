import express from 'express';
import { createServer } from 'http';
import path from 'path';

export async function setupNextJs(expressApp: express.Application) {
  // Serve static files
  expressApp.use(express.static(path.join(process.cwd(), 'public')));
  
  // Basic HTML template for React rendering
  const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cush - Global Immigration Services</title>
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <link href="https://cdn.tailwindcss.com" rel="stylesheet">
</head>
<body>
    <div id="root">
        <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
                <div class="text-center mb-8">
                    <h1 class="text-3xl font-bold text-gray-900 mb-2">Welcome to Cush</h1>
                    <p class="text-gray-600">Global Immigration Services Platform</p>
                </div>
                <div class="space-y-4">
                    <a href="/login" class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-200 block text-center">
                        Sign In
                    </a>
                    <a href="/dashboard" class="w-full border border-blue-600 text-blue-600 py-3 px-4 rounded-lg hover:bg-blue-50 transition duration-200 block text-center">
                        Dashboard
                    </a>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;

  // Serve main routes
  expressApp.get('/', (req, res) => {
    res.send(htmlTemplate);
  });

  expressApp.get('/login', (req, res) => {
    const loginTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign In - Cush</title>
    <link href="https://cdn.tailwindcss.com" rel="stylesheet">
</head>
<body>
    <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
            <div class="text-center mb-8">
                <h1 class="text-3xl font-bold text-gray-900 mb-2">Sign In</h1>
                <p class="text-gray-600">Access your Cush account</p>
            </div>
            <form id="loginForm" class="space-y-6">
                <div>
                    <label for="email" class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input type="email" id="email" name="email" required 
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                    <label for="password" class="block text-sm font-medium text-gray-700 mb-2">Password</label>
                    <input type="password" id="password" name="password" required 
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                <button type="submit" class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-200">
                    Sign In
                </button>
            </form>
            <div class="mt-6 text-center">
                <p class="text-sm text-gray-600">
                    Don't have an account? 
                    <a href="/register" class="text-blue-600 hover:text-blue-800 font-medium">Sign up</a>
                </p>
                <a href="/" class="inline-block mt-4 text-sm text-gray-500 hover:text-gray-700">← Back to Home</a>
            </div>
        </div>
    </div>
    <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = {
                email: formData.get('email'),
                password: formData.get('password')
            };
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                if (response.ok) {
                    window.location.href = '/dashboard';
                } else {
                    const error = await response.json();
                    alert('Login failed: ' + (error.error || 'Unknown error'));
                }
            } catch (err) {
                alert('Network error. Please try again.');
            }
        });
    </script>
</body>
</html>`;
    res.send(loginTemplate);
  });

  expressApp.get('/dashboard', (req, res) => {
    const dashboardTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - Cush</title>
    <link href="https://cdn.tailwindcss.com" rel="stylesheet">
</head>
<body>
    <div class="min-h-screen bg-gray-50">
        <!-- Navigation -->
        <nav class="bg-white shadow-sm border-b">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between h-16">
                    <div class="flex items-center">
                        <h1 class="text-xl font-semibold text-gray-900">Cush Dashboard</h1>
                    </div>
                    <div class="flex items-center space-x-4">
                        <span id="userInfo" class="text-sm text-gray-600">Loading...</span>
                        <button onclick="logout()" class="text-sm text-red-600 hover:text-red-800">Sign Out</button>
                    </div>
                </div>
            </div>
        </nav>

        <!-- Main Content -->
        <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div class="px-4 py-6 sm:px-0">
                <!-- Welcome Section -->
                <div class="bg-white overflow-hidden shadow rounded-lg mb-6">
                    <div class="p-6">
                        <h2 class="text-2xl font-bold text-gray-900 mb-2">Welcome to Your Dashboard</h2>
                        <p class="text-gray-600">Manage your immigration journey and financial goals</p>
                    </div>
                </div>

                <!-- Dashboard Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <!-- Financial Overview -->
                    <div class="bg-white overflow-hidden shadow rounded-lg">
                        <div class="p-6">
                            <div class="flex items-center">
                                <div class="flex-shrink-0">
                                    <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                        <span class="text-white text-sm font-medium">$</span>
                                    </div>
                                </div>
                                <div class="ml-4">
                                    <h3 class="text-lg font-medium text-gray-900">Financial Overview</h3>
                                    <p class="text-sm text-gray-500">Track your savings and goals</p>
                                </div>
                            </div>
                            <div class="mt-4">
                                <div class="text-2xl font-bold text-gray-900" id="balance">$0.00</div>
                                <p class="text-sm text-green-600">+2.5% from last month</p>
                            </div>
                        </div>
                    </div>

                    <!-- Immigration Status -->
                    <div class="bg-white overflow-hidden shadow rounded-lg">
                        <div class="p-6">
                            <div class="flex items-center">
                                <div class="flex-shrink-0">
                                    <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                        <span class="text-white text-sm font-medium">✓</span>
                                    </div>
                                </div>
                                <div class="ml-4">
                                    <h3 class="text-lg font-medium text-gray-900">Immigration Status</h3>
                                    <p class="text-sm text-gray-500">Application progress</p>
                                </div>
                            </div>
                            <div class="mt-4">
                                <div class="text-sm font-medium text-gray-900">Documentation Review</div>
                                <div class="mt-2 w-full bg-gray-200 rounded-full h-2">
                                    <div class="bg-green-500 h-2 rounded-full" style="width: 65%"></div>
                                </div>
                                <p class="text-sm text-gray-500 mt-1">65% Complete</p>
                            </div>
                        </div>
                    </div>

                    <!-- Quick Actions -->
                    <div class="bg-white overflow-hidden shadow rounded-lg">
                        <div class="p-6">
                            <h3 class="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                            <div class="space-y-3">
                                <button class="w-full text-left px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition">
                                    Schedule Consultation
                                </button>
                                <button class="w-full text-left px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition">
                                    Upload Documents
                                </button>
                                <button class="w-full text-left px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition">
                                    Check Job Board
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Recent Activity -->
                <div class="mt-6 bg-white overflow-hidden shadow rounded-lg">
                    <div class="p-6">
                        <h3 class="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
                        <div class="space-y-4" id="recentActivity">
                            <div class="flex items-start space-x-3">
                                <div class="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                                <div>
                                    <p class="text-sm text-gray-900">Document verification completed</p>
                                    <p class="text-xs text-gray-500">2 hours ago</p>
                                </div>
                            </div>
                            <div class="flex items-start space-x-3">
                                <div class="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                                <div>
                                    <p class="text-sm text-gray-900">Financial goal updated</p>
                                    <p class="text-xs text-gray-500">1 day ago</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Check authentication status
        async function checkAuth() {
            try {
                const response = await fetch('/api/auth/session');
                if (response.ok) {
                    const user = await response.json();
                    document.getElementById('userInfo').textContent = user.email || user.username || 'User';
                    loadDashboardData();
                } else {
                    window.location.href = '/login';
                }
            } catch (err) {
                console.error('Auth check failed:', err);
                window.location.href = '/login';
            }
        }

        async function loadDashboardData() {
            try {
                const response = await fetch('/api/dashboard');
                if (response.ok) {
                    const data = await response.json();
                    document.getElementById('balance').textContent = '$' + (data.balance || 0).toLocaleString();
                }
            } catch (err) {
                console.error('Failed to load dashboard data:', err);
            }
        }

        async function logout() {
            try {
                await fetch('/api/auth/logout', { method: 'POST' });
                window.location.href = '/';
            } catch (err) {
                console.error('Logout failed:', err);
                window.location.href = '/';
            }
        }

        // Initialize dashboard
        checkAuth();
    </script>
</body>
</html>`;
    res.send(dashboardTemplate);
  });

  expressApp.get('/register', (req, res) => {
    const registerTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign Up - Cush</title>
    <link href="https://cdn.tailwindcss.com" rel="stylesheet">
</head>
<body>
    <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
            <div class="text-center mb-8">
                <h1 class="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
                <p class="text-gray-600">Join the Cush platform</p>
            </div>
            <form id="registerForm" class="space-y-6">
                <div>
                    <label for="username" class="block text-sm font-medium text-gray-700 mb-2">Username</label>
                    <input type="text" id="username" name="username" required 
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                    <label for="email" class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input type="email" id="email" name="email" required 
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                    <label for="firstName" class="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                    <input type="text" id="firstName" name="firstName" required 
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                    <label for="lastName" class="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                    <input type="text" id="lastName" name="lastName" required 
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                    <label for="password" class="block text-sm font-medium text-gray-700 mb-2">Password</label>
                    <input type="password" id="password" name="password" required 
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                <div class="space-y-3">
                    <label class="flex items-center">
                        <input type="checkbox" id="acceptTerms" name="acceptTerms" required class="mr-2">
                        <span class="text-sm text-gray-600">I accept the Terms of Service</span>
                    </label>
                    <label class="flex items-center">
                        <input type="checkbox" id="acceptPrivacy" name="acceptPrivacy" required class="mr-2">
                        <span class="text-sm text-gray-600">I accept the Privacy Policy</span>
                    </label>
                </div>
                <button type="submit" class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-200">
                    Create Account
                </button>
            </form>
            <div class="mt-6 text-center">
                <p class="text-sm text-gray-600">
                    Already have an account? 
                    <a href="/login" class="text-blue-600 hover:text-blue-800 font-medium">Sign in</a>
                </p>
                <a href="/" class="inline-block mt-4 text-sm text-gray-500 hover:text-gray-700">← Back to Home</a>
            </div>
        </div>
    </div>
    <script>
        document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = {
                username: formData.get('username'),
                email: formData.get('email'),
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                password: formData.get('password'),
                acceptTerms: document.getElementById('acceptTerms').checked,
                acceptPrivacy: document.getElementById('acceptPrivacy').checked
            };
            
            try {
                const response = await fetch('/api/auth/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                if (response.ok) {
                    alert('Account created successfully! Please sign in.');
                    window.location.href = '/login';
                } else {
                    const error = await response.json();
                    alert('Registration failed: ' + (error.error || 'Unknown error'));
                }
            } catch (err) {
                alert('Network error. Please try again.');
            }
        });
    </script>
</body>
</html>`;
    res.send(registerTemplate);
  });

  // Fallback for other routes
  expressApp.get('*', (req, res) => {
    if (!req.url.startsWith('/api')) {
      res.send(htmlTemplate);
    }
  });

  return Promise.resolve();
}

export function createIntegratedServer(expressApp: express.Application) {
  return createServer(expressApp);
}