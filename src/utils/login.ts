import { SupabaseClient } from '@supabase/supabase-js';

export async function setupLoginForm(supabase: SupabaseClient) {
  // Get error div reference first
  const errorDiv = document.getElementById('error-message') as HTMLDivElement;
  
  // Check for email confirmation
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  // Handle returning confirmed user
  if (session?.user && !sessionError) {
    const pendingUserData = localStorage.getItem('pendingUserData');
    if (pendingUserData) {
      try {
        const userData = JSON.parse(pendingUserData);
        
        // Update the existing profile with additional information
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update({
            phone: userData.phone,
            address: userData.address,
            is_mureed: userData.isMureed
          })
          .eq('user_id', session.user.id);

        if (profileError) {
          throw new Error(`Profile update failed: ${profileError.message}`);
        }

        // Clear the stored data
        localStorage.removeItem('pendingUserData');
        
        // Redirect to signin page
        window.location.href = '/login?confirmed=true';
        return;
      } catch (error) {
        console.error('Error creating profile:', error);
      }
    }
  }

  // Check URL parameters for various flows
  const urlParams = new URLSearchParams(window.location.search);
  const type = urlParams.get('type');

  if (urlParams.get('confirmed') === 'true') {
    errorDiv.className = 'bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative';
    errorDiv.textContent = 'Email confirmed! You can now sign in with your credentials.';
    errorDiv.style.display = 'block';
    // Remove the confirmed parameter from URL
    window.history.replaceState({}, '', '/login');
  } else if (type === 'recovery') {
    // Get the access token from URL
    const accessToken = urlParams.get('access_token');
    if (!accessToken) {
      errorDiv.className = 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative';
      errorDiv.textContent = 'Invalid password reset link. Please request a new one.';
      errorDiv.style.display = 'block';
      return;
    }

    // Show password reset form and hide others
    const resetForm = document.getElementById('reset-password-form') as HTMLFormElement;
    const signinForm = document.getElementById('signin-form') as HTMLFormElement;
    const signupForm = document.getElementById('signup-form') as HTMLFormElement;
    const pageTitle = document.querySelector('h2') as HTMLHeadingElement;
    const formSwitchText = document.getElementById('form-switch-text') as HTMLParagraphElement;
    
    if (formSwitchText) {
      formSwitchText.style.display = 'none';
    }
    
    if (resetForm && signinForm && signupForm && pageTitle) {
      resetForm.classList.remove('hidden');
      signinForm.classList.add('hidden');
      signupForm.classList.add('hidden');
      pageTitle.textContent = 'Reset Password';
      
      // Handle password reset form submission
      resetForm.addEventListener('submit', async (e: Event) => {
        e.preventDefault();
        const newPassword = (document.getElementById('new-password') as HTMLInputElement).value;
        const confirmPassword = (document.getElementById('confirm-new-password') as HTMLInputElement).value;
        
        if (newPassword !== confirmPassword) {
          errorDiv.className = 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative';
          errorDiv.textContent = 'Passwords do not match';
          errorDiv.style.display = 'block';
          return;
        }
        
        const submitButton = resetForm.querySelector('button[type="submit"]') as HTMLButtonElement;
        submitButton.disabled = true;
        submitButton.textContent = 'Updating...';

        try {
          const { error } = await supabase.auth.updateUser({
            password: newPassword
          });

          if (error) {
            console.error('Password Update Error:', error);
            throw new Error('Unable to update password. Please try again.');
          }

          errorDiv.className = 'bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative';
          errorDiv.textContent = 'Password updated successfully! You can now sign in with your new password.';
          errorDiv.style.display = 'block';

          // Switch back to sign in form after a delay
          setTimeout(() => {
            resetForm.classList.add('hidden');
            signinForm.classList.remove('hidden');
            pageTitle.textContent = 'Sign in';
            // Clean up URL
            window.history.replaceState({}, '', '/login');
          }, 2000);
        } catch (error) {
          errorDiv.className = 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative';
          errorDiv.textContent = error instanceof Error ? error.message : 'Failed to update password';
          errorDiv.style.display = 'block';
        }
      });
    }
  }

  // Form switching logic
  const signinForm = document.getElementById('signin-form') as HTMLFormElement | null;
  const signupForm = document.getElementById('signup-form') as HTMLFormElement | null;
  const showSignupBtn = document.getElementById('show-signup') as HTMLButtonElement | null;
  const showSigninBtn = document.getElementById('show-signin') as HTMLButtonElement | null;
  const pageTitle = document.querySelector('h2') as HTMLHeadingElement | null;

  const formSwitchText = document.getElementById('form-switch-text') as HTMLParagraphElement | null;

  // Function to switch to sign up form
  const switchToSignUp = (e: Event) => {
    e.preventDefault();
    signupForm?.classList.remove('hidden');
    signinForm?.classList.add('hidden');
    if (pageTitle) pageTitle.textContent = 'Sign up';
    if (formSwitchText) {
      formSwitchText.innerHTML = 'Already have an account? <a href="#" class="text-white border-b-2 border-yellow-400 no-underline" id="show-signin">Sign in</a>';
      document.getElementById('show-signin')?.addEventListener('click', switchToSignIn);
    }
  };

  // Function to switch to sign in form
  const switchToSignIn = (e: Event) => {
    e.preventDefault();
    signinForm?.classList.remove('hidden');
    signupForm?.classList.add('hidden');
    if (pageTitle) pageTitle.textContent = 'Sign in';
    if (formSwitchText) {
      formSwitchText.innerHTML = 'Don\'t have an account? <a href="#" class="text-white border-b-2 border-yellow-400 no-underline" id="show-signup">Sign up</a>';
      document.getElementById('show-signup')?.addEventListener('click', switchToSignUp);
    }
  };

  // Add initial event listeners
  showSignupBtn?.addEventListener('click', switchToSignUp);

  // Setup forgot password functionality
  const forgotPasswordBtn = document.getElementById('forgot-password') as HTMLButtonElement;
  forgotPasswordBtn?.addEventListener('click', async () => {
    const emailInput = document.querySelector('#signin-email') as HTMLInputElement;
    
    if (!emailInput.value) {
      errorDiv.className = 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative';
      errorDiv.textContent = 'Please enter your email address';
      errorDiv.style.display = 'block';
      return;
    }

    const submitButton = forgotPasswordBtn;
    submitButton.disabled = true;
    submitButton.textContent = 'Sending...';

    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(emailInput.value, {
        redirectTo: `${window.location.origin}/login?type=recovery`
      });

      if (error) {
        console.error('Reset Error:', error);
        throw error;
      }

      errorDiv.className = 'bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative';
      errorDiv.textContent = 'Password reset instructions have been sent to your email. Please check your inbox.';
      errorDiv.style.display = 'block';
    } catch (error) {
      console.error('Reset Error Details:', error);
      errorDiv.className = 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative';
      errorDiv.textContent = 'Unable to send reset instructions. Please try again later.';
      errorDiv.style.display = 'block';
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Forgot your password?';
    }
  });

  // Setup sign in form
  signinForm?.addEventListener('submit', async (e: Event) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    const emailInput = form.querySelector('#signin-email') as HTMLInputElement;
    const passwordInput = form.querySelector('#signin-password') as HTMLInputElement;

    submitButton.disabled = true;
    submitButton.textContent = 'Signing in...';

    try {
      // Attempt to sign in
      const { data: { session }, error } = await supabase.auth.signInWithPassword({
        email: emailInput.value,
        password: passwordInput.value,
      });

      if (error) {
        // Check specific error types
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Please check your email and confirm your account before signing in. If you need a new confirmation email, please sign up again.');
        } else if (error.message.includes('Invalid login credentials')) {
          throw new Error('Incorrect email or password. Please try again.');
        }
        throw error;
      }

      // Double check email confirmation as a safeguard
      if (!session?.user.email_confirmed_at) {
        throw new Error('Your email is not confirmed. Please check your email for the confirmation link.');
      }

      // Redirect to home page on successful sign in
      window.location.href = '/';
    } catch (error) {
      errorDiv.className = 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative';
      errorDiv.textContent = error instanceof Error ? error.message : 'An error occurred during sign in';
      errorDiv.style.display = 'block';
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Sign in';
    }
  });

  // Setup sign up form
  const signupEmailInput = document.getElementById('signup-email') as HTMLInputElement;
  const signupPasswordInput = document.getElementById('signup-password') as HTMLInputElement;
  const confirmPasswordInput = document.getElementById('confirm-password') as HTMLInputElement;

  signupForm?.addEventListener('submit', async (e: Event) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;

    if (signupPasswordInput.value !== confirmPasswordInput.value) {
      errorDiv.textContent = 'Passwords do not match';
      errorDiv.style.display = 'block';
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Signing up...';
    
    try {
      const firstName = (document.getElementById('first-name') as HTMLInputElement)?.value;
      const lastName = (document.getElementById('last-name') as HTMLInputElement)?.value;
      const phone = (document.getElementById('phone') as HTMLInputElement)?.value;
      const address = (document.getElementById('address') as HTMLTextAreaElement)?.value;
      const isMureed = (document.querySelector('input[name="isMureed"]:checked') as HTMLInputElement)?.value;

      // Store form data in localStorage for later use after email confirmation
      const userData = {
        firstName,
        lastName,
        phone,
        address,
        isMureed: isMureed === 'yes',
        email: signupEmailInput.value
      };
      localStorage.setItem('pendingUserData', JSON.stringify(userData));

      // Create auth user with required email confirmation
      const { data: { user, session }, error: authError } = await supabase.auth.signUp({
        email: signupEmailInput.value,
        password: signupPasswordInput.value,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: {
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`
          }
        }
      });
      
      if (authError) {
        console.error('Auth Error:', authError);
        throw new Error(`Authentication failed: ${authError.message}`);
      }

      // If there's no session, it means email confirmation is required
      if (!session) {
        // Show success message about email confirmation
        errorDiv.className = 'bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative';
        errorDiv.textContent = 'Please check your email for a confirmation link to complete your registration. You cannot sign in until you confirm your email.';
        errorDiv.style.display = 'block';
        return;
      }

      // If we get here, email confirmation was not required (should not happen if configured correctly)
      errorDiv.className = 'bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative';
      errorDiv.textContent = 'Please check your email for a confirmation link to complete your registration.';
      errorDiv.style.display = 'block';
    } catch (error) {
      errorDiv.className = errorDiv.className.replace('bg-green-100 border-green-400 text-green-700', 'bg-red-100 border-red-400 text-red-700');
      errorDiv.textContent = error instanceof Error ? error.message : 'An error occurred during sign up';
      errorDiv.style.display = 'block';
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Sign up';
    }
  });
}
