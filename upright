if [ -d themes/upright ]; then
  rm -r themes/upright
fi
cp -R themes/default themes/upright

cd themes/upright
for file in *.json; do
  newFile=`echo $file | sed 's/-color-theme.json/-upright-color-theme.json/'`
  mv $file $newFile
done
for file in *.json; do 
  sed -i '' 's/"P. /"P. Upright /g' $file;
  sed -i '' 's/"fontStyle": "italic",//g' $file;
  sed -i '' 's/italic underline/underline/g' $file;
  sed -i '' 's/bold italic/bold/g' $file;
done

cd ..
