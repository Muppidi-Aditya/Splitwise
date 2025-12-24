import './index.css'
import { Component } from "react";
import { useNavigate } from 'react-router-dom';
import Navbar from "../../components/Navbar";
import { sendOTP, register, setToken, setUser } from "../../services/api";

class Register extends Component {
    constructor(props) {
        super(props);
        this.state = {
            name: '',
            email: '',
            otp: ['', '', '', '', '', ''],
            otpIndex: 0,
            isOtpSent: false,
            isLoading: false,
            error: null
        };
        this.otpInputs = [];
    }

    handleNameChange = (e) => {
        const value = e.target.value.slice(0, 50);
        this.setState({ name: value, error: null });
    }

    handleEmailChange = (e) => {
        const value = e.target.value.toLowerCase().trim();
        this.setState({ email: value, error: null });
    }

    handleOtpChange = (index, e) => {
        const value = e.target.value;
        const numValue = value.replace(/\D/g, '').slice(0, 1);
        const otp = [...this.state.otp];
        
        if (value.length > 1) {
            const digits = value.replace(/\D/g, '').slice(0, 6).split('');
            digits.forEach((digit, i) => {
                if (index + i < 6) {
                    otp[index + i] = digit;
                }
            });
            this.setState({ otp });
            const lastFilledIndex = Math.min(index + digits.length - 1, 5);
            const nextEmptyIndex = otp.findIndex((d, i) => i > lastFilledIndex && !d);
            setTimeout(() => {
                if (nextEmptyIndex !== -1) {
                    this.otpInputs[nextEmptyIndex]?.focus();
                } else if (lastFilledIndex < 5) {
                    this.otpInputs[lastFilledIndex + 1]?.focus();
                } else {
                    this.otpInputs[5]?.focus();
                }
            }, 0);
            return;
        }
        
        otp[index] = numValue;
        this.setState({ otp });

        if (numValue && index < 5) {
            setTimeout(() => {
                this.otpInputs[index + 1]?.focus();
            }, 0);
        }
    }

    handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace') {
            const otp = [...this.state.otp];
            if (otp[index] && index < 5) {
                otp[index] = '';
                this.setState({ otp });
            } else if (!otp[index] && index > 0) {
                otp[index - 1] = '';
                this.setState({ otp });
                setTimeout(() => {
                    this.otpInputs[index - 1]?.focus();
                }, 0);
            }
        }
        else if (e.key === 'ArrowLeft' && index > 0) {
            e.preventDefault();
            this.otpInputs[index - 1]?.focus();
        } else if (e.key === 'ArrowRight' && index < 5) {
            e.preventDefault();
            this.otpInputs[index + 1]?.focus();
        }
    }

    handleSendOtp = async (e) => {
        e.preventDefault();
        
        if (!this.state.name.trim()) {
            this.setState({ error: 'Please enter your name' });
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!this.state.email || !emailRegex.test(this.state.email)) {
            this.setState({ error: 'Please enter a valid email address' });
            return;
        }

        this.setState({ isLoading: true, error: null });

        try {
            const response = await sendOTP(this.state.email, 'register', this.state.name);
            
            if (response.success) {
                this.setState({ 
                    isOtpSent: true, 
                    isLoading: false,
                    error: null
                });
                this.otpInputs[0]?.focus();
                
                if (response.otp) {
                    console.log('OTP:', response.otp);
                }
            } else {
                this.setState({ 
                    isLoading: false,
                    error: response.message || 'Failed to send OTP'
                });
            }
        } catch (error) {
            this.setState({ 
                isLoading: false,
                error: error.message || 'Failed to send OTP. Please try again.'
            });
        }
    }

    handleVerifyOtp = async (e) => {
        e.preventDefault();
        
        if (this.state.otp.some(digit => !digit)) {
            this.setState({ error: 'Please enter all 6 digits' });
            return;
        }

        const otpString = this.state.otp.join('');
        this.setState({ isLoading: true, error: null });

        try {
            const response = await register(this.state.email, otpString, this.state.name);
            
            if (response.success) {
                setToken(response.token);
                setUser(response.user);
                
                this.props.navigate('/');
                
                alert(`Registration successful! Welcome ${this.state.name}`);
            } else {
                this.setState({ 
                    isLoading: false,
                    error: response.message || 'Invalid OTP or registration failed'
                });
            }
        } catch (error) {
            this.setState({ 
                isLoading: false,
                error: error.message || 'Failed to register. Please try again.'
            });
        }
    }

    render() {
        const OptInputHolder = () => {
            return (
                <div className='otp-main-block'>
                    {this.state.otp.map((digit, index) => (
                        <input
                            key={index}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength="6"
                            className='otp-block'
                            value={digit}
                            onChange={(e) => this.handleOtpChange(index, e)}
                            onKeyDown={(e) => this.handleOtpKeyDown(index, e)}
                            onFocus={(e) => e.target.select()}
                            ref={(input) => (this.otpInputs[index] = input)}
                            disabled={!this.state.isOtpSent || this.state.isLoading}
                            autoComplete="off"
                        />
                    ))}
                </div>
            )
        }

        return (
            <div className="login-page-wrapper">
                <Navbar />
                <div className="login-page-container">
                    <div className="login-card">
                        <div className="login-header">
                            <h2>Create Account</h2>
                            <p>Enter your details to get started</p>
                        </div>
                        
                        {this.state.error && (
                            <div className="error-message">
                                {this.state.error}
                            </div>
                        )}

                        <form className='login-form' onSubmit={this.state.isOtpSent ? this.handleVerifyOtp : this.handleSendOtp}>
                            <div className="input-group">
                                <label htmlFor="name">Full Name</label>
                                <input
                                    id="name"
                                    type="text"
                                    placeholder="Enter your full name"
                                    className='phn-number-inp'
                                    value={this.state.name}
                                    onChange={this.handleNameChange}
                                    disabled={this.state.isOtpSent || this.state.isLoading}
                                    maxLength="50"
                                />
                            </div>

                            <div className="input-group">
                                <label htmlFor="email">Email Address</label>
                                <input
                                    id="email"
                                    type="email"
                                    placeholder="Enter your email address"
                                    className='phn-number-inp'
                                    value={this.state.email}
                                    onChange={this.handleEmailChange}
                                    disabled={this.state.isOtpSent || this.state.isLoading}
                                />
                            </div>

                            {this.state.isOtpSent && (
                                <div className="input-group otp-group">
                                    <label>Enter OTP</label>
                                    <OptInputHolder />
                                    <p className="otp-hint">We've sent a 6-digit code to your email</p>
                                </div>
                            )}

                            <button 
                                type="submit" 
                                className="submit-btn"
                                disabled={this.state.isLoading || (this.state.isOtpSent ? this.state.otp.some(d => !d) : !this.state.name.trim() || !this.state.email)}
                            >
                                {this.state.isLoading ? (
                                    <span className="loading-spinner"></span>
                                ) : (
                                    this.state.isOtpSent ? 'Verify OTP' : 'Send OTP'
                                )}
                            </button>

                            {this.state.isOtpSent && (
                                <button
                                    type="button"
                                    className="resend-btn"
                                    onClick={() => {
                                        this.setState({ 
                                            isOtpSent: false, 
                                            otp: ['', '', '', '', '', ''], 
                                            otpIndex: 0,
                                            error: null
                                        });
                                    }}
                                >
                                    Change Email Address
                                </button>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        )
    }
}

const RegisterWithNavigate = (props) => {
    const navigate = useNavigate();
    return <Register {...props} navigate={navigate} />;
};

export default RegisterWithNavigate;

