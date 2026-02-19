import React from 'react';
import { Lock, ArrowLeft } from 'lucide-react';
import './Unauthorized.css';

const Unauthorized = () => {
    return (
        <div className="unauthorized-container">
            <div className="unauthorized-content">
                <div className="icon-wrapper">
                    <Lock size={64} className="lock-icon" />
                </div>

                <h1 className="unauthorized-title">401 Unauthorized</h1>

                <div className="divider"></div>

                <div className="recruitment-card">
                    <h2 className="recruitment-title">🦞 龍蝦幫招募令 🦞</h2>

                    <div className="recruitment-text">
                        <p>看來你還沒拿到入幫許可證，或者身分驗證失敗了！</p>
                        <p>我們在尋找志同道合的夥伴，一同在開發的江湖中闖蕩。</p>
                        <p>如果你有熱忱、有義氣，歡迎聯絡幫主申請入幫！</p>
                    </div>

                    <div className="divider-small"></div>

                    <div className="contact-info">
                        聯絡人： <span className="contact-name">龍蝦幫幫主</span>
                    </div>

                    <a href="https://t.me/ungetLai" target="_blank" rel="noopener noreferrer" className="action-btn">
                        <ArrowLeft size={18} />
                        <span>前往聯絡幫主</span>
                    </a>
                </div>
            </div>
        </div>
    );
};

export default Unauthorized;
