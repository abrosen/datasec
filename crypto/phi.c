/*  in C because C++ is goofy on yamacraw
*/
#include <stdio.h>
#include <stdlib.h>
#include <ctype.h>

/*
*  count the monomer, dimer, and trimer in the input and generate 
*  phi
*
*  skip non printable,
*  skip blank etc (a-z)
*  convert to one case (lower )
*
*  assumes ascii ordering (a-z) consecutive a lowest
*/


main()
{

int count[26],count2[26][26],count3[26][26][26];
int a;
int i,j,k;
int aletter;
int bletter;
int cletter;
float phi;


a = 'a';

/* yes there is a way do to this at initialization time */
	for( i=0; i< 26; i++)
	{
		count[i] = 0;
		for( j=0; j< 26; j++)
		{
		count2[i][j] = 0;
		for( k=0; k< 26; k++)
		{
			count3[i][j][k] = 0;
		}
		}
	}

	bletter = -1;
	cletter = -1;
	while( (aletter = fgetc(stdin) )!= EOF)
	{
		aletter = tolower(aletter) - a;
		if( aletter < 0 || aletter > 25) continue;
		count[aletter]++;
		
		if( bletter >= 0)
		{
			count2[aletter][bletter] ++;
			if( cletter >= 0)
			{
			count3[aletter][bletter][cletter]++;
			}
		}
/* right shift  (ugly ain't it?) */
		cletter = bletter; 
		bletter = aletter;		

	}
/* so now have the raw 1,2,3mer counts */
/*  now to make the phi functions */


	phi = 0.;
	aletter = 0;
	for( i=0; i< 26; i++)
	{
		aletter += count[i];
		phi += count[i]*(count[i] -1);
	}
	printf(" phi on monomers is %f\n", phi/(aletter*(aletter-1)));

	phi = 0.;
	aletter = 0;
	for( j=0; j< 26; j++)
	for( i=0; i< 26; i++)
	{
		aletter += count2[i][j];
		phi += count2[i][j]*(count2[i][j] -1);
	}
	printf(" phi on dimers is %f\n", phi/(aletter*(aletter-1)));

	phi = 0.;
	aletter = 0;
	for( k=0; k< 26; k++)
	for( j=0; j< 26; j++)
	for( i=0; i< 26; i++)
	{
		aletter += count3[i][j][k];
		phi += count3[i][j][k]*(count3[i][j][k] -1);
	}
	printf(" phi on trimers is %f\n", phi/(aletter*(aletter-1)));

	


}/* end of main */
