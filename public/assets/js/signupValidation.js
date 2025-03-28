// signup validation

// regex user name
function validateName(name) {
  const nameValidate = /^[A-Za-z0-9]+$/;
  return nameValidate.test(name);
}

// Regex mobile
function validateNumber(number) {
  const numberValidate = /^[0-9]{10}$/;
  return numberValidate.test(number);
}

// regex email
function validateEmail(email) {
  const emailValidate = /^[^\s@]+@gmail.com$/;
  return emailValidate.test(email);
}

// regex checking strong password
function validatePassword(password) {
  const passwordValidate = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  // P@ssw0rd!     P@ssw0rd!

  return passwordValidate.test(password);
}

// validation checking for form
function signupValidation() {
  let isValid = true;
  let name = document.getElementById('name').value;
  let number = document.getElementById('phonenumber').value;
  let email = document.getElementById('email').value;
  let password = document.getElementById('password').value;
  

  document.getElementById('nameError').textContent = '';
  document.getElementById('phonenumberError').textContent = '';
  document.getElementById('emailError').textContent = '';
  document.getElementById('passwordError').textContent = '';
 document.getElementById('confirmpassword').textContent = '';
  // checking name
  if (name.trim() === '') {
    document.getElementById('nameError').textContent = 'Name is required';
    setTimeout(() => {
      document.getElementById('nameError').textContent = '';
    }, 5000);
    isValid = false;
  }
  if (!validateName(name)) {
    document.getElementById('nameError').textContent =
      'First letter must be capital and space not allowed';
    setTimeout(() => {
      document.getElementById('nameError').textContent = '';
    }, 5000);
    isValid = false;
  }

  // Checking email
  if (email.trim() === '') {
    document.getElementById('emailError').textContent = 'Email is required';
    setTimeout(() => {
      document.getElementById('emailError').textContent = '';
    }, 5000);
    isValid = false;
  } else if (!validateEmail(email)) {
    document.getElementById('emailError').textContent = 'Enter a valid email';
    setTimeout(() => {
      document.getElementById('emailError').textContent = '';
    }, 5000);
    isValid = false;
  }

  // checking phone number
  if (number.trim() === '') {
    document.getElementById('phonenumberError').textContent =
      'Phone number is required';
    setTimeout(() => {
      document.getElementById('phonenumberError').textContent = '';
    }, 5000);
    isValid = false;
  } else if (!validateNumber(number)) {
    document.getElementById('phonenumberError').textContent =
      'Enter a valid Phone number';
    setTimeout(() => {
      document.getElementById('confirmpassword').textContent = '';
    }, 5000);
    isValid = false;
  }

  // checking strong password
  if (password.trim() === '') {
    document.getElementById('passwordError').textContent =
      'Password is required';
    setTimeout(() => {
      document.getElementById('passwordError').textContent = '';
    }, 5000);
    isValid = false;
  } else if (!validatePassword(password)) {
    document.getElementById('passwordError').textContent =
      'Password should contain at least 8 characters including an uppercase letter, a lowercase letter, a number, and a special character';
    setTimeout(() => {
      document.getElementById('passwordError').textContent = '';
    }, 5000);
    isValid = false;
  }
  return isValid;
}
