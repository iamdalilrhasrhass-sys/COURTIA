/**
 * Input Validators
 */

const validators = {
  email: (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },

  password: (password) => {
    return password && password.length >= 6;
  },

  phone: (phone) => {
    const re = /^[\d\s\-\+\(\)]+$/;
    return phone ? re.test(phone) : true;
  },

  firstName: (name) => {
    return name && name.length >= 2 && name.length <= 100;
  },

  lastName: (name) => {
    return name && name.length >= 2 && name.length <= 100;
  },

  postalCode: (code) => {
    return code ? /^\d{5}$/.test(code) : true;
  }
};

module.exports = validators;
