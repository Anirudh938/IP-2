import React from 'react';
import './index.css';
import { Link } from 'react-router-dom';
import useAuth from '../../../hooks/useAuth';

/**
 * Renders a login form with username and password inputs, password visibility toggle,
 * error handling, and a link to the signup page.
 */
const Login = () => {
  const {
    username,
    password,
    showPassword,
    err,
    handleSubmit,
    handleInputChange,
    togglePasswordVisibility,
  } = useAuth('login');

  return (
    <div className='container'>
      <h2>Welcome to FakeStackOverflow!</h2>
      <h3>Please login to continue.</h3>
      <form onSubmit={handleSubmit}>
        <h4>Please enter your username.</h4>
        {/* The input field should correctly update the displayed value when text
        is entered. Use the 'input-text' class for styling.
        */}
        <input
          type='text'
          className='input-text'
          value={username}
          onChange={e => handleInputChange(e, 'username')}
          placeholder='Enter your username'
          required
        />
        <h4>Please enter your password.</h4>
        {/* The input field should correctly update the value when text
        is entered. Make sure that the password visibility is correctly toggled.
        Use the 'input-text' class for styling.
        */}
        <input
          type={showPassword ? 'text' : 'password'}
          className='input-text'
          value={password}
          onChange={e => handleInputChange(e, 'password')}
          placeholder='Enter your password'
          required
        />
        <div className='show-password'>
          {/* The field should correctly update the password visibility when checked/unchecked.
        Use the id 'showPasswordToggle'. No styling class is required here.
        */}
          <input
            type='checkbox'
            id='showPasswordToggle'
            checked={showPassword}
            onChange={togglePasswordVisibility}
          />
          <label htmlFor='showPasswordToggle'>Show Password</label>
        </div>
        <button type='submit' className='login-button'>
          Submit
        </button>
      </form>
      {err && <p className='error-message'>{err}</p>}
      <Link to='/signup' className='signup-link'>
        Don&apos;t have an account? Sign up here.
      </Link>
    </div>
  );
};

export default Login;
