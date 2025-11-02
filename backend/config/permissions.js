// Role-based permission system for EBOOKDZ
// Defines what each user role can access and modify

const permissions = {
  // Non-registered users - limited browsing only
  'non-registered': {
    books: ['read'], // Can browse books but not purchase
    categories: ['read'],
    reviews: ['read'] // Can read reviews but not create
  },

  // Pending users - registered but waiting for admin approval
  'pending': {
    books: ['read'],
    categories: ['read'],
    profile: ['read'], // Can view their own profile
    reviews: ['read']
  },

  // Approved clients - can purchase and read books
  'client': {
    books: ['read'], // Browse and purchase books
    categories: ['read'],
    profile: ['read', 'update'], // Manage their profile
    transactions: ['read'], // View their purchase history
    purchases: ['read'], // Access their library
    reviews: ['create', 'read', 'update', 'delete'], // Manage their reviews
    downloads: ['read'] // Download purchased books
  },

  // Vendors - can sell books and manage SlickPay
  'vendor': {
    books: ['create', 'read', 'update', 'delete'], // Full book management
    categories: ['read'],
    profile: ['read', 'update'],
    transactions: ['read'], // View their sales
    purchases: ['read'], // Their own purchases
    reviews: ['read'], // Read reviews of their books
    slickpay: ['create', 'read', 'update', 'delete'], // Manage API keys
    analytics: ['read'], // View sales analytics
    uploads: ['create', 'read', 'update', 'delete'] // Manage book files
  },

  // Admins - full platform control
  'admin': {
    '*': ['*'], // Full access to everything
    users: ['create', 'read', 'update', 'delete'], // User management
    books: ['create', 'read', 'update', 'delete'], // Book approvals
    categories: ['create', 'read', 'update', 'delete'],
    transactions: ['read'], // View all transactions
    analytics: ['read'], // Platform analytics
    system: ['read', 'update'], // System settings
    approvals: ['create', 'read', 'update', 'delete'] // User/book approvals
  }
};

// Check if user has permission for a specific action on a resource
const hasPermission = (userRole, resource, action) => {
  // Handle non-authenticated users
  if (!userRole) {
    userRole = 'non-registered';
  }

  const rolePermissions = permissions[userRole];
  if (!rolePermissions) {
    return false;
  }

  // Admin has full access
  if (rolePermissions['*'] && rolePermissions['*'].includes('*')) {
    return true;
  }

  // Check specific resource permissions
  const resourcePermissions = rolePermissions[resource];
  if (!resourcePermissions) {
    return false;
  }

  // Check if action is allowed
  return resourcePermissions.includes(action) || resourcePermissions.includes('*');
};

// Check multiple permissions at once
const hasPermissions = (userRole, checks) => {
  return checks.every(({ resource, action }) => 
    hasPermission(userRole, resource, action)
  );
};

// Get all permissions for a role
const getRolePermissions = (userRole) => {
  return permissions[userRole] || {};
};

// Check if user can access admin features
const isAdmin = (userRole) => {
  return userRole === 'admin';
};

// Check if user can manage books (vendor or admin)
const canManageBooks = (userRole) => {
  return hasPermission(userRole, 'books', 'create') || isAdmin(userRole);
};

// Check if user can make purchases
const canPurchase = (userRole, userStatus) => {
  return (userRole === 'client' || userRole === 'vendor' || userRole === 'admin') && 
         userStatus === 'approved';
};

// Check if user needs admin approval
const needsApproval = (userStatus) => {
  return userStatus === 'pending';
};

// Resource-specific permission checks
const resourcePermissions = {
  // Book-related permissions
  canCreateBook: (userRole, userStatus) => {
    return (userRole === 'vendor' || userRole === 'admin') && userStatus === 'approved';
  },

  canApproveBook: (userRole) => {
    return userRole === 'admin';
  },

  canPurchaseBook: (userRole, userStatus) => {
    return canPurchase(userRole, userStatus);
  },

  // User management permissions
  canApproveUser: (userRole) => {
    return userRole === 'admin';
  },

  canViewAnalytics: (userRole) => {
    return userRole === 'vendor' || userRole === 'admin';
  },

  // SlickPay permissions
  canManageSlickPay: (userRole, userStatus) => {
    return (userRole === 'vendor' || userRole === 'admin') && userStatus === 'approved';
  },

  // System permissions
  canAccessAdminPanel: (userRole) => {
    return userRole === 'admin';
  },

  canManageSystemSettings: (userRole) => {
    return userRole === 'admin';
  }
};

module.exports = {
  permissions,
  hasPermission,
  hasPermissions,
  getRolePermissions,
  isAdmin,
  canManageBooks,
  canPurchase,
  needsApproval,
  resourcePermissions
};