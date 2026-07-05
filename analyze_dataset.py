import pandas as pd

df = pd.read_csv('dataset/Combined Data.csv')
print('Total rows:', len(df))
print()
print('Label distribution:')
print(df['status'].value_counts())
print()
print('Null values:')
print(df.isnull().sum())
print()
print('Sample statements per class:')
for s in df['status'].unique():
    print(f'\n--- {s} ---')
    print(df[df['status']==s]['statement'].iloc[0][:120])
