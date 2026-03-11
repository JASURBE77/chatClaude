const mongoose = require('mongoose');

const uri = 'mongodb+srv://newkanekichan13_db_user:o9YD63Xe4gHNXbRe@cluster0.lhhmtkk.mongodb.net/myapp?retryWrites=true&w=majority';

mongoose.connect(uri)
  .then(() => console.log('✅ Ulanish muvaffaqiyatli!'))
  .catch(err => console.log('❌ Xato:', err.message));