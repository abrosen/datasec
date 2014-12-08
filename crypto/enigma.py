"""
0.044270523416 (9, 14, 24) 44.5960001945
0.044270523416 freudeschonergotterfunckentochterauselysiumwirbetrethenfeuertrunkenhimmilischedeinheilgtumdeinezauberbindenwiederwasdiemodestrenggeteiltallemenschenwerdenbruderwodeinsanfterflugelweitwemdergrossewurfgelungeeinesfreundesfreundzuseinwereinholdesweiverrungenmischeseinenjubeleinjawerauchnureineseeleseinnenntaufdemerdenrundundwersniegekonntderstehleweinendsichausdiesmbundfreudetrinkenallewesenandenbrustendernaturallegutenallebosenfolgenihrerrosenspurkussegabsieunsundrebeneinenfruendgepruftimtodwollustwarddemwurmgegebenunddercherubstehtvorgottvorgott

"""

from crypto_tools import phi, psi, phi2, getFreqs
from itertools import combinations, permutations, product
import string
from time import time


class Bank(object):
    """
    A virtual bank of enigma rotors!
    Not idiotproof!

    Usage:
    add rotors in order, with the inverter last.
    Rotors are stored in self.rotors and their rotations 
    are tracked in a dict, using the Rotor as key
    (Rotor is a hashable type)

    """

    def __init__(self):
        self.rotations = {}
        self.rotors = [] 
        self.homes = []

    def addRotor(self, rotor, offset = 0):
        self.rotors.append(rotor)
        self.rotations[rotor] = offset
        self.homes.append(offset)

    def clear(self):
        """
        removes all rotors
        """
        self.rotations = {}
        self.rotors = []

    """def scrambleRotors(self, positions):
        for rotor,offset in zip(self.rotors,positions):
            self.rotations[rotor] =  offset
            """

    def reset(self):
        for i, home in enumerate(self.homes):
            self.rotations[self.rotors[i]] =home

    def set(self,settings):
        for i, setting in enumerate(settings):
            self.rotations[self.rotors[i]] = setting


    def encrypt(self, message):
        """ also decrypt"""
        return string.joinfields(map(self.encryptChar, message), "")

    def encryptChar(self, char):        
        
        for rotor in self.rotors:
            char = rotor.forward(char, self.rotations[rotor])

        # from the second to last rotor to the first
        for rotor in self.rotors[-2::-1]:
            char = rotor.reverse(char, self.rotations[rotor])
        self.rotate()
        return char


    def rotate(self):
        turn = True
        for rotor in self.rotors[-2::-1]:
            if turn == False or rotor.isInverter():
                break
            offset =  self.rotations[rotor]
            self.rotations[rotor], turn = rotor.turnover(offset)





class Rotor(object):
    def __init__(self):
        self.inv = False
        self.mod = -1
        self.ins =  []
        self.outs = []

    def turnover(self, i):
        i = i + 1
        if i >= self.mod:
            i %= self.mod
            return i, True
        return i, False

    def symbolFromIndex(self,index):
        return self.ins[index]

    def isInverter(self):
        return self.inv

    def load(self, ins, outs, inv):
        """
        Loads the rotor with the proper ins and outs
        rejects if the mapping is bad
        """
        self.inv = inv

        if not len(ins) == len(outs):
            return False
        #if set(list(ins)).issubset(list(set(outs))):
        #    print set(ins), set(outs)
            return False
        if inv: 
            for i,j in zip(ins,outs):
                if i == j:
                    print i,j
                    return False

        # It passed
        self.mod = len(ins)
        self.inv = inv

        if not inv:
            self.ins =  list(ins)
            self.outs =  list(outs)
            return True

        else:
            self.ins =  list(ins)
            
            self.outs =  ['\x00']*self.mod
            
            for i in range(0,self.mod):
                if self.outs[i] != '\x00':
                    continue
                if self.outs[self.ins.index(outs[i])] != '\x00':
                    continue 
                self.outs[i] = outs[i]
                for j in xrange(0, self.mod):
                    if self.ins[j] == self.outs[i]:
                        if self.outs[j] != '\x00':
                            continue
                        self.outs[j]= self.ins[i]
                        break
            #for i in range(0,self.mod):
            #    if self.outs[i] == '\x00':
            #        print "!"
            #        self.outs[i] = self.ins[i]
            #print self.ins
            #print self.outs
            
    def forward(self,char, offset):
        if self.isInverter():
            offset = 0
        outIndex = self.ins.index(char)
        outIndex += offset
        outIndex = outIndex % self.mod
        return self.outs[outIndex]

    def reverse(self, char, offset):
        if self.isInverter():
            offset = 0
        inIndex = self.outs.index(char)
        inIndex -= offset
        inIndex = inIndex % self.mod
        return self.ins[inIndex]


def solve(ciphertext, rotors):
    t = time()  
    machine = Bank()
    best_phi =  -50
    best_text  = "BAD"

    for NUM_ROTORS in xrange(1, 4):
        machine.clear()
        for r in rotors[:NUM_ROTORS]:
            machine.addRotor(r)
        machine.addRotor(rotors[-1])
        for setting in product(range(26), repeat = NUM_ROTORS):
            machine.set(setting)    
            plaintext = machine.encrypt(ciphertext)
            score = phi2(getFreqs(plaintext))
            #print setting
            if score > 0.01:
                if score > best_phi:
                    best_phi = score
                    best_text = plaintext
                    print best_phi, setting, time() - t
    print best_phi, best_text



def testGiven(text,rotors):
    machine = Bank()
    for i,r in enumerate(rotors):
        machine.addRotor(r,i)
    c = machine.encrypt(text)
    print c
    machine.reset()
    print machine.encrypt(c)



def main():
    corpus  =  open("cipher.problem.2").read()
    rotors = [] 
    args = [
    ("abcdefghijklmnopqrstuvwxyz", "abcghidefjklpqrmnostxyzuvw",False), 
    ("abcdefghijklmnopqrstuvwxyz", "defghijklmnopqrstuvwxyzabc",False), 
    ("abcdefghijklmnopqrstuvwxyz", "zxbcdefghijklnmpqosrtuvway",False), 
    ("abcdefghijklmnopqrstuvwxyz", "zxbcdefghijklosrtuvwaynmpq",False), 
    ("abcdefghijklmnopqrstuvwxyz", "abcghidefjklpqrmnostxyzuvw",False), 
    ("abcdefghijklmnopqrstuvwxyz", "defghijklmnopqrstuvwxyzabc",False), 
    ("abcdefghijklmnopqrstuvwxyz", "zxbcdefghijklnmpqosrtuvway",False), 
    ("abcdefghijklmnopqrstuvwxyz", "zxbcdefghijklosrtuvwaynmpq",False), 
    ("abcdefghijklmnopqrstuvwxyz", "abcghidefjklpqrmnostxyzuvw",False), 
    ("abcdefghijklmnopqrstuvwxyz", "zyabcdefghijklmnopqrstxwuv",True)
    ]

    for a in args:
        r = Rotor()
        r.load(*a)
        rotors.append(r)
    testText = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaasdferqiopwrjeqwrkjnasdjklfhjklhasdfjkhbewarethejabberwocky"
    #testGiven(testText,rotors)
    solve(corpus, rotors)

if __name__ == '__main__':
    main()