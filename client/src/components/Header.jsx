import { useState, useEffect } from 'react';

const Header = ({ title = "Welcome to MindScale", subtitle }) => {
  const [greeting, setGreeting] = useState(title);
  const [currentDate, setCurrentDate] = useState('Today is loading...');

  useEffect(() => {
    if (!subtitle) {
      const now = new Date();
      const hours = now.getHours();
      let newGreeting = 'Welcome to MindScale';
      
      if (hours < 12) {
        newGreeting = 'Good Morning, Friend';
      } else if (hours < 17) {
        newGreeting = 'Good Afternoon, Friend';
      } else if (hours < 22) {
        newGreeting = 'Good Evening, Friend';
      } else {
        newGreeting = 'Rest Well, Friend';
      }
      
      setGreeting(newGreeting);
      
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      setCurrentDate(`Today is ${now.toLocaleDateString('en-US', options)}`);
    } else {
      setGreeting(title);
      setCurrentDate(subtitle);
    }
  }, [title, subtitle]);

  return (
    <header className="mb-10">
      <div className="welcome-msg">
        <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-br from-white via-white to-slate-400 bg-clip-text text-transparent tracking-tight mb-2">
          {greeting}
        </h1>
        <p className="text-textSecondary text-[1.05rem] font-normal">
          {currentDate}
        </p>
      </div>
    </header>
  );
};

export default Header;
